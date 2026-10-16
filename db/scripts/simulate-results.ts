// DEV ONLY: fills past fixtures with random but realistic results, using the same
// saveMatchResult() the admin form will use. Re-run after db:seed:reset to start over.
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db } from "../index";
import { fixtures, players, teams } from "../schema";
import {
  saveMatchResult,
  type CardInput,
  type GoalInput,
} from "../../lib/results";

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(17);

function pick<T>(list: T[]): T {
  return list[Math.floor(random() * list.length)];
}
function weighted<T>(options: [T, number][]): T {
  let roll = random() * options.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return options[options.length - 1][0];
}
function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Squad = { id: number; position: string }[];

// 11 starters (1 GK, 4 DF, 4 MF, 2 ST) + 3 subs. The first-choice keeper plays 80% of games.
function pickLineup(squad: Squad): Squad {
  const keepers = squad.filter((p) => p.position === "GK");
  const keeper = random() < 0.8 ? keepers[0] : pick(keepers);
  const outfield = (position: string, count: number) =>
    shuffle(squad.filter((p) => p.position === position)).slice(0, count);
  const starters = [
    keeper,
    ...outfield("DF", 4),
    ...outfield("MF", 4),
    ...outfield("ST", 2),
  ];
  const subs = shuffle(
    squad.filter((p) => p.position !== "GK" && !starters.includes(p)),
  ).slice(0, 3);
  return [...starters, ...subs];
}

const goalsScored = (atHome: boolean) =>
  weighted<number>([
    [0, atHome ? 22 : 30],
    [1, 33],
    [2, 24],
    [3, 13],
    [4, 6],
    [5, 2],
  ]);

function makeGoals(
  count: number,
  teamId: number,
  lineup: Squad,
  opponents: Squad,
): GoalInput[] {
  return Array.from({ length: count }, () => {
    const minute = 1 + Math.floor(random() * 90);
    const roll = random();
    if (roll < 0.03) {
      const defenders = opponents.filter((p) => p.position === "DF");
      return { teamId, playerId: pick(defenders).id, minute, isOwnGoal: true };
    }
    if (roll < 0.06) return { teamId, playerId: null, minute }; // unknown scorer
    const position = weighted<string>([
      ["ST", 50],
      ["MF", 35],
      ["DF", 15],
    ]);
    const candidates = lineup.filter((p) => p.position === position);
    const scorer = candidates.length ? pick(candidates) : pick(lineup);
    return { teamId, playerId: scorer.id, minute, isPenalty: random() < 0.08 };
  });
}

function makeCards(teamId: number, lineup: Squad): CardInput[] {
  const yellows = weighted<number>([
    [0, 30],
    [1, 35],
    [2, 22],
    [3, 13],
  ]);
  const booked = shuffle(lineup.filter((p) => p.position !== "GK")).slice(
    0,
    yellows,
  );
  const result: CardInput[] = booked.map((p) => ({
    teamId,
    playerId: p.id,
    type: "yellow" as const,
    minute: 10 + Math.floor(random() * 80),
  }));
  if (random() < 0.05) {
    result.push({
      teamId,
      playerId: pick(lineup).id,
      type: "red",
      minute: 30 + Math.floor(random() * 60),
    });
  }
  return result;
}

async function main() {
  if (process.env.ALLOW_DB_RESET !== "true") {
    throw new Error(
      "simulated results are for development databases only (ALLOW_DB_RESET=true)",
    );
  }

  const due = await db
    .select({
      id: fixtures.id,
      matchweek: fixtures.matchweek,
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
    })
    .from(fixtures)
    .where(
      and(eq(fixtures.status, "scheduled"), lt(fixtures.kickoffAt, new Date())),
    )
    .orderBy(asc(fixtures.kickoffAt), asc(fixtures.id));

  if (due.length === 0) {
    console.log("Nothing to simulate: every past fixture already has a result");
    return;
  }

  const allPlayers = await db
    .select({
      id: players.id,
      teamId: players.teamId,
      position: players.position,
    })
    .from(players)
    .orderBy(asc(players.id));
  const squadOf = (teamId: number) =>
    allPlayers.filter((p) => p.teamId === teamId);
  const teamNames = new Map(
    (await db.select({ id: teams.id, name: teams.name }).from(teams)).map(
      (t) => [t.id, t.name] as const,
    ),
  );

  for (const f of due) {
    const homeLineup = pickLineup(squadOf(f.homeTeamId));
    const awayLineup = pickLineup(squadOf(f.awayTeamId));
    const homeGoals = makeGoals(
      goalsScored(true),
      f.homeTeamId,
      homeLineup,
      awayLineup,
    );
    const awayGoals = makeGoals(
      goalsScored(false),
      f.awayTeamId,
      awayLineup,
      homeLineup,
    );
    const motmPool =
      homeGoals.length > awayGoals.length
        ? homeLineup
        : awayGoals.length > homeGoals.length
          ? awayLineup
          : [...homeLineup, ...awayLineup];

    await saveMatchResult(f.id, {
      homeScore: homeGoals.length,
      awayScore: awayGoals.length,
      goals: [...homeGoals, ...awayGoals],
      cards: [
        ...makeCards(f.homeTeamId, homeLineup),
        ...makeCards(f.awayTeamId, awayLineup),
      ],
      appearances: [
        ...homeLineup.map((p) => ({ teamId: f.homeTeamId, playerId: p.id })),
        ...awayLineup.map((p) => ({ teamId: f.awayTeamId, playerId: p.id })),
      ],
      motmPlayerId: pick(motmPool).id,
    });

    console.log(
      `MW${f.matchweek}: ${teamNames.get(f.homeTeamId)} ${homeGoals.length}-${awayGoals.length} ${teamNames.get(f.awayTeamId)}`,
    );
  }

  const { rows } = await db.execute(sql`
    select (select count(*) from fixtures where status = 'finished')::int as finished,
           (select count(*) from goals)::int as goals,
           (select count(*) from cards)::int as cards,
           (select count(*) from appearances)::int as appearances
  `);
  console.log(`✓ Saved ${due.length} results:`, rows[0]);
}

main()
  .catch((error) => {
    console.error(`✗ Simulation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
