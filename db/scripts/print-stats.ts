// Prints the computed table, top scorers and a few player stats so we can check them by eye.
import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { players, teams } from "../schema";
import {
  getCurrentSeason,
  getLeagueTable,
  getPlayerSeasonStats,
  getTopScorers,
} from "../../lib/stats";

const pad = (value: string | number, width: number) =>
  String(value).padStart(width);

async function main() {
  const season = await getCurrentSeason("sazsl");
  if (!season) throw new Error("no current season for league 'sazsl'");
  console.log(`${season.leagueName} ${season.seasonName}\n`);

  const table = await getLeagueTable(season.seasonId);
  console.log(
    pad("#", 2) +
      "  " +
      "Team".padEnd(22) +
      pad("P", 3) +
      pad("W", 3) +
      pad("D", 3) +
      pad("L", 3) +
      pad("GF", 4) +
      pad("GA", 4) +
      pad("GD", 5) +
      pad("Pts", 5) +
      "  Form",
  );
  for (const r of table) {
    const gd =
      r.goalDifference > 0 ? `+${r.goalDifference}` : String(r.goalDifference);
    console.log(
      pad(r.position, 2) +
        "  " +
        r.name.padEnd(22) +
        pad(r.played, 3) +
        pad(r.won, 3) +
        pad(r.drawn, 3) +
        pad(r.lost, 3) +
        pad(r.goalsFor, 4) +
        pad(r.goalsAgainst, 4) +
        pad(gd, 5) +
        pad(r.points, 5) +
        "  " +
        r.form.join(""),
    );
  }

  console.log("\nTop scorers");
  const scorers = await getTopScorers(season.seasonId, 5);
  scorers.forEach((s, i) =>
    console.log(`${i + 1}. ${s.name} (${s.teamName}): ${s.goals}`),
  );

  if (scorers[0]) {
    const stats = await getPlayerSeasonStats(
      scorers[0].playerId,
      season.seasonId,
    );
    console.log(`\n${scorers[0].name}:`, stats);
  }

  // Exactly one keeper plays each match, so these should add up to the team's totals
  const keepers = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .innerJoin(teams, eq(teams.id, players.teamId))
    .where(
      and(eq(teams.slug, "glen-view-warriors"), eq(players.position, "GK")),
    )
    .orderBy(asc(players.jerseyNumber));
  console.log("\nGlen View Warriors keepers");
  for (const k of keepers) {
    const s = await getPlayerSeasonStats(k.id, season.seasonId);
    console.log(
      `  ${k.name}: ${s.appearances} apps, ${s.cleanSheets} clean sheets`,
    );
  }
}

main()
  .catch((error) => {
    console.error(`✗ Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
