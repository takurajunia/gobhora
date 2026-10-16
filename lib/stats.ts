// Read-only queries that calculate everything shown on the site from the stored results.
// Nothing here is cached; the pages decide how long to cache each result.
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { leagues, seasons } from "../db/schema";

export type Outcome = "W" | "D" | "L";

export async function getCurrentSeason(leagueSlug: string) {
  const [row] = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      leagueId: leagues.id,
      leagueName: leagues.name,
    })
    .from(seasons)
    .innerJoin(leagues, eq(leagues.id, seasons.leagueId))
    .where(and(eq(leagues.slug, leagueSlug), eq(seasons.isCurrent, true)));
  return row ?? null;
}

type RawTableRow = {
  id: number;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string;
};

export type TableRow = Omit<RawTableRow, "form"> & {
  position: number;
  form: Outcome[];
};

// Sorted by points, then goal difference, then goals scored. Form is newest first.
export async function getLeagueTable(seasonId: number): Promise<TableRow[]> {
  const { rows } = await db.execute<RawTableRow>(sql`
    with team_results as (
      select f.id, f.kickoff_at, f.home_team_id as team_id, f.home_score as gf, f.away_score as ga
      from fixtures f
      where f.season_id = ${seasonId} and f.status = 'finished'
      union all
      select f.id, f.kickoff_at, f.away_team_id, f.away_score, f.home_score
      from fixtures f
      where f.season_id = ${seasonId} and f.status = 'finished'
    ),
    ranked as (
      select team_id, gf, ga,
             case when gf > ga then 'W' when gf = ga then 'D' else 'L' end as outcome,
             row_number() over (partition by team_id order by kickoff_at desc, id desc) as recency
      from team_results
    )
    select t.id, t.name, t.slug,
           t.short_name as "shortName",
           t.logo_url as "logoUrl",
           count(r.team_id)::int as played,
           (count(*) filter (where r.outcome = 'W'))::int as won,
           (count(*) filter (where r.outcome = 'D'))::int as drawn,
           (count(*) filter (where r.outcome = 'L'))::int as lost,
           coalesce(sum(r.gf), 0)::int as "goalsFor",
           coalesce(sum(r.ga), 0)::int as "goalsAgainst",
           coalesce(sum(r.gf - r.ga), 0)::int as "goalDifference",
           (3 * count(*) filter (where r.outcome = 'W')
              + count(*) filter (where r.outcome = 'D'))::int as points,
           coalesce(string_agg(r.outcome, '' order by r.recency) filter (where r.recency <= 5), '') as form
    from teams t
    join seasons s on s.id = ${seasonId} and s.league_id = t.league_id
    left join ranked r on r.team_id = t.id
    group by t.id
    order by points desc, "goalDifference" desc, "goalsFor" desc, t.name
  `);

  return rows.map((row, index) => ({
    ...row,
    position: index + 1,
    form: row.form.split("") as Outcome[],
  }));
}

export type ScorerRow = {
  playerId: number;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  teamName: string | null;
  teamSlug: string | null;
  teamLogoUrl: string | null;
  goals: number;
};

// Own goals never count towards a player's tally. Totals follow a player after a transfer.
export async function getTopScorers(
  seasonId: number,
  limit = 10,
): Promise<ScorerRow[]> {
  const { rows } = await db.execute<ScorerRow>(sql`
    select p.id as "playerId", p.name, p.nickname, p.photo_url as "photoUrl",
           t.name as "teamName", t.slug as "teamSlug", t.logo_url as "teamLogoUrl",
           count(*)::int as goals
    from goals g
    join fixtures f on f.id = g.fixture_id
    join players p on p.id = g.player_id
    left join teams t on t.id = p.team_id
    where f.season_id = ${seasonId} and not g.is_own_goal
    group by p.id, t.id
    order by goals desc, p.name
    limit ${limit}
  `);
  return rows;
}

export type PlayerSeasonStats = {
  appearances: number;
  goals: number;
  ownGoals: number;
  penalties: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  motm: number;
  goalsByTeam: { teamName: string; goals: number }[];
};

export async function getPlayerSeasonStats(
  playerId: number,
  seasonId: number,
): Promise<PlayerSeasonStats> {
  const {
    rows: [totals],
  } = await db.execute<Omit<PlayerSeasonStats, "goalsByTeam">>(sql`
    with season_fixtures as (
      select id, home_team_id, away_team_id, home_score, away_score, motm_player_id
      from fixtures
      where season_id = ${seasonId} and status = 'finished'
    )
    select
      (select count(*) from appearances a join season_fixtures f on f.id = a.fixture_id
        where a.player_id = ${playerId})::int as appearances,
      (select count(*) from goals g join season_fixtures f on f.id = g.fixture_id
        where g.player_id = ${playerId} and not g.is_own_goal)::int as goals,
      (select count(*) from goals g join season_fixtures f on f.id = g.fixture_id
        where g.player_id = ${playerId} and g.is_own_goal)::int as "ownGoals",
      (select count(*) from goals g join season_fixtures f on f.id = g.fixture_id
        where g.player_id = ${playerId} and g.is_penalty)::int as penalties,
      (select count(*) from cards c join season_fixtures f on f.id = c.fixture_id
        where c.player_id = ${playerId} and c.type = 'yellow')::int as "yellowCards",
      (select count(*) from cards c join season_fixtures f on f.id = c.fixture_id
        where c.player_id = ${playerId} and c.type = 'red')::int as "redCards",
      (select count(*) from season_fixtures f
        where f.motm_player_id = ${playerId})::int as motm,
      (select count(*) from appearances a
        join season_fixtures f on f.id = a.fixture_id
        join players p on p.id = a.player_id
        where a.player_id = ${playerId} and p.position = 'GK'
          and (case when a.team_id = f.home_team_id then f.away_score else f.home_score end) = 0
      )::int as "cleanSheets"
  `);

  // Season goals split by the team he scored them for (matters after a transfer)
  const { rows: goalsByTeam } = await db.execute<{
    teamName: string;
    goals: number;
  }>(sql`
    select t.name as "teamName", count(*)::int as goals
    from goals g
    join fixtures f on f.id = g.fixture_id
    join teams t on t.id = g.team_id
    where g.player_id = ${playerId} and f.season_id = ${seasonId} and not g.is_own_goal
    group by t.id
    order by goals desc
  `);

  return { ...totals, goalsByTeam };
}
