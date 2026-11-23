// Read-only queries that calculate everything shown on the site from the stored results.
// Nothing here is cached; the pages decide how long to cache each result.
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { leagues, positionEnum, seasons } from "../db/schema";
import type { SearchItem } from "./search";

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
// Totals = matches entered in GoBhora + any carried-over standings (team_carryovers).
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
    ),
    match_totals as (
      select team_id,
             count(*) as played,
             count(*) filter (where outcome = 'W') as won,
             count(*) filter (where outcome = 'D') as drawn,
             count(*) filter (where outcome = 'L') as lost,
             sum(gf) as goals_for,
             sum(ga) as goals_against,
             string_agg(outcome, '' order by recency) filter (where recency <= 5) as form
      from ranked
      group by team_id
    ),
    totals as (
      select t.id, t.name, t.slug, t.short_name, t.logo_url,
             coalesce(m.played, 0) + coalesce(c.played, 0) as played,
             coalesce(m.won, 0) + coalesce(c.won, 0) as won,
             coalesce(m.drawn, 0) + coalesce(c.drawn, 0) as drawn,
             coalesce(m.lost, 0) + coalesce(c.lost, 0) as lost,
             coalesce(m.goals_for, 0) + coalesce(c.goals_for, 0) as goals_for,
             coalesce(m.goals_against, 0) + coalesce(c.goals_against, 0) as goals_against,
             coalesce(m.form, '') as form
      from teams t
      join seasons s on s.id = ${seasonId} and s.league_id = t.league_id
      left join match_totals m on m.team_id = t.id
      left join team_carryovers c on c.team_id = t.id and c.season_id = ${seasonId}
    )
    select id, name, slug, short_name as "shortName", logo_url as "logoUrl",
           played::int, won::int, drawn::int, lost::int,
           goals_for::int as "goalsFor",
           goals_against::int as "goalsAgainst",
           (goals_for - goals_against)::int as "goalDifference",
           (3 * won + drawn)::int as points,
           form
    from totals
    order by points desc, "goalDifference" desc, "goalsFor" desc, name
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

// Own goals never count. Carried-over goals are added. Totals follow a player after a transfer.
export async function getTopScorers(
  seasonId: number,
  limit = 10,
): Promise<ScorerRow[]> {
  const { rows } = await db.execute<ScorerRow>(sql`
    with tallies as (
      select g.player_id, count(*) as goals
      from goals g
      join fixtures f on f.id = g.fixture_id
      where f.season_id = ${seasonId} and not g.is_own_goal and g.player_id is not null
      group by g.player_id
      union all
      select c.player_id, sum(c.goals)
      from player_carryovers c
      where c.season_id = ${seasonId}
      group by c.player_id
    )
    select p.id as "playerId", p.name, p.nickname, p.photo_url as "photoUrl",
           t.name as "teamName", t.slug as "teamSlug", t.logo_url as "teamLogoUrl",
           sum(x.goals)::int as goals
    from tallies x
    join players p on p.id = x.player_id
    left join teams t on t.id = p.team_id
    group by p.id, t.id
    having sum(x.goals) > 0
    order by goals desc, p.name
    limit ${limit}
  `);
  return rows;
}

export type Carryover = {
  goals: number;
  ownGoals: number;
  redCards: number;
  yellowCardsTracked: boolean;
  source: string;
};

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
  carryover: Carryover | null; // set when the totals include pre-GoBhora data
};

export async function getPlayerSeasonStats(
  playerId: number,
  seasonId: number,
): Promise<PlayerSeasonStats> {
  const {
    rows: [totals],
  } = await db.execute<
    Omit<PlayerSeasonStats, "goalsByTeam" | "carryover">
  >(sql`
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

  // Totals carried over from before GoBhora (the stats sheet), if any
  const {
    rows: [carried],
  } = await db.execute<{
    entries: number;
    goals: number;
    ownGoals: number;
    redCards: number;
    yellowCards: number | null;
    source: string | null;
  }>(sql`
    select count(*)::int as entries,
           coalesce(sum(goals), 0)::int as goals,
           coalesce(sum(own_goals), 0)::int as "ownGoals",
           coalesce(sum(red_cards), 0)::int as "redCards",
           sum(yellow_cards)::int as "yellowCards",
           min(source) as source
    from player_carryovers
    where player_id = ${playerId} and season_id = ${seasonId}
  `);

  // Season goals split by the team he scored them for (matters after a transfer)
  const { rows: goalsByTeam } = await db.execute<{
    teamName: string;
    goals: number;
  }>(sql`
    select t.name as "teamName", sum(x.goals)::int as goals
    from (
      select g.team_id, count(*) as goals
      from goals g
      join fixtures f on f.id = g.fixture_id
      where g.player_id = ${playerId} and f.season_id = ${seasonId} and not g.is_own_goal
      group by g.team_id
      union all
      select c.team_id, c.goals
      from player_carryovers c
      where c.player_id = ${playerId} and c.season_id = ${seasonId} and c.goals > 0
    ) x
    join teams t on t.id = x.team_id
    group by t.id
    order by goals desc
  `);

  const carryover: Carryover | null =
    carried.entries > 0
      ? {
          goals: carried.goals,
          ownGoals: carried.ownGoals,
          redCards: carried.redCards,
          yellowCardsTracked: carried.yellowCards !== null,
          source: carried.source ?? "",
        }
      : null;

  return {
    ...totals,
    goals: totals.goals + (carryover?.goals ?? 0),
    ownGoals: totals.ownGoals + (carryover?.ownGoals ?? 0),
    redCards: totals.redCards + (carryover?.redCards ?? 0),
    yellowCards: totals.yellowCards + (carried.yellowCards ?? 0),
    goalsByTeam,
    carryover,
  };
}

export type MatchTeam = {
  id: number;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
};

export type GoalEvent = {
  teamId: number;
  name: string | null; // null = unknown scorer
  nickname: string | null;
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
};

export type ResultRow = {
  fixtureId: number;
  matchweek: number | null;
  kickoffAt: Date | null;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number;
  awayScore: number;
  goals: GoalEvent[];
};

export type FixtureRow = {
  fixtureId: number;
  matchweek: number | null;
  kickoffAt: Date | null;
  home: MatchTeam;
  away: MatchTeam;
  venueName: string | null;
};

export type MotmRow = {
  playerId: number;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  teamName: string | null;
  awards: number;
};

// Builds a JSON team object from a joined teams table alias (only ever called with "h" or "a")
const teamJson = (alias: "h" | "a") =>
  sql.raw(
    `json_build_object('id', ${alias}.id, 'name', ${alias}.name, 'slug', ${alias}.slug, ` +
      `'shortName', ${alias}.short_name, 'logoUrl', ${alias}.logo_url)`,
  );

// Optional "only matches involving this team" condition
const teamFilter = (teamId?: number) =>
  teamId
    ? sql`and (f.home_team_id = ${teamId} or f.away_team_id = ${teamId})`
    : sql``;

// Drizzle returns timestamps from raw SQL as text. to_json() makes Postgres send them as ISO
// strings ("2026-10-10T13:00:00+00:00"), which we turn into real Date objects before returning.
type RawKickoff<T> = Omit<T, "kickoffAt"> & { kickoffAt: string | null };
const toDate = (iso: string | null) => (iso ? new Date(iso) : null);

// Newest results first, each with its goals in minute order
export async function getRecentResults(
  seasonId: number,
  limit = 6,
  teamId?: number,
): Promise<ResultRow[]> {
  const { rows } = await db.execute<RawKickoff<ResultRow>>(sql`
    select f.id as "fixtureId", f.matchweek, to_json(f.kickoff_at) as "kickoffAt",
           f.home_score as "homeScore", f.away_score as "awayScore",
           ${teamJson("h")} as home,
           ${teamJson("a")} as away,
           coalesce((
             select json_agg(json_build_object(
                      'teamId', g.team_id,
                      'name', p.name,
                      'nickname', p.nickname,
                      'minute', g.minute,
                      'isOwnGoal', g.is_own_goal,
                      'isPenalty', g.is_penalty)
                    order by g.minute nulls last, g.id)
             from goals g
             left join players p on p.id = g.player_id
             where g.fixture_id = f.id
           ), '[]'::json) as goals
    from fixtures f
    join teams h on h.id = f.home_team_id
    join teams a on a.id = f.away_team_id
    where f.season_id = ${seasonId} and f.status = 'finished'
    ${teamFilter(teamId)}
    order by f.kickoff_at desc, f.id
    limit ${limit}
  `);
  return rows.map((row) => ({ ...row, kickoffAt: toDate(row.kickoffAt) }));
}

// Matches without a result yet, soonest first
export async function getUpcomingFixtures(
  seasonId: number,
  limit = 6,
  teamId?: number,
): Promise<FixtureRow[]> {
  const { rows } = await db.execute<RawKickoff<FixtureRow>>(sql`
    select f.id as "fixtureId", f.matchweek, to_json(f.kickoff_at) as "kickoffAt",
           ${teamJson("h")} as home,
           ${teamJson("a")} as away,
           v.name as "venueName"
    from fixtures f
    join teams h on h.id = f.home_team_id
    join teams a on a.id = f.away_team_id
    left join venues v on v.id = f.venue_id
    where f.season_id = ${seasonId} and f.status = 'scheduled'
    ${teamFilter(teamId)}
    order by f.kickoff_at, f.id
    limit ${limit}
  `);
  return rows.map((row) => ({ ...row, kickoffAt: toDate(row.kickoffAt) }));
}

export async function getMotmLeaders(
  seasonId: number,
  limit = 10,
): Promise<MotmRow[]> {
  const { rows } = await db.execute<MotmRow>(sql`
    select p.id as "playerId", p.name, p.nickname, p.photo_url as "photoUrl",
           t.name as "teamName", count(*)::int as awards
    from fixtures f
    join players p on p.id = f.motm_player_id
    left join teams t on t.id = p.team_id
    where f.season_id = ${seasonId} and f.status = 'finished'
    group by p.id, t.id
    order by awards desc, p.name
    limit ${limit}
  `);
  return rows;
}

export type Position = (typeof positionEnum.enumValues)[number];

export type TeamProfile = {
  id: number;
  leagueSlug: string;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  area: string | null;
  foundedYear: number | null;
  managerName: string | null;
  managerPhotoUrl: string | null;
  venueName: string | null;
};

export async function getTeamBySlug(slug: string): Promise<TeamProfile | null> {
  const { rows } = await db.execute<TeamProfile>(sql`
    select t.id, l.slug as "leagueSlug", t.name, t.slug,
           t.short_name as "shortName", t.logo_url as "logoUrl", t.area,
           t.founded_year as "foundedYear", t.manager_name as "managerName",
           t.manager_photo_url as "managerPhotoUrl", v.name as "venueName"
    from teams t
    join leagues l on l.id = t.league_id
    left join venues v on v.id = t.home_venue_id
    where t.slug = ${slug}
  `);
  return rows[0] ?? null;
}

export type SquadPlayer = {
  id: number;
  name: string;
  nickname: string | null;
  position: Position | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  isCaptain: boolean;
  appearances: number;
  goals: number;
};

// Current squad with each player's season apps and goals (for any team, so totals follow a transfer)
export async function getSquad(
  teamId: number,
  seasonId: number,
): Promise<SquadPlayer[]> {
  const { rows } = await db.execute<SquadPlayer>(sql`
    select p.id, p.name, p.nickname, p.position,
           p.jersey_number as "jerseyNumber", p.photo_url as "photoUrl",
           p.is_captain as "isCaptain",
           (select count(*) from appearances a join fixtures f on f.id = a.fixture_id
             where a.player_id = p.id and f.season_id = ${seasonId} and f.status = 'finished')::int as appearances,
           ((select count(*) from goals g join fixtures f on f.id = g.fixture_id
             where g.player_id = p.id and f.season_id = ${seasonId} and not g.is_own_goal)
            + coalesce((select sum(c.goals) from player_carryovers c
                        where c.player_id = p.id and c.season_id = ${seasonId}), 0))::int as goals
    from players p
    where p.team_id = ${teamId} and p.status = 'active'
    order by p.position nulls last, p.jersey_number nulls last, p.name
  `);
  return rows;
}

export type PlayerProfile = {
  id: number;
  name: string;
  nickname: string | null;
  position: Position | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  isCaptain: boolean;
  teamName: string | null;
  teamSlug: string | null;
  teamShortName: string | null;
  teamLogoUrl: string | null;
  leagueSlug: string | null;
};

export async function getPlayerProfile(
  playerId: number,
): Promise<PlayerProfile | null> {
  const { rows } = await db.execute<PlayerProfile>(sql`
    select p.id, p.name, p.nickname, p.position,
           p.jersey_number as "jerseyNumber", p.photo_url as "photoUrl",
           p.is_captain as "isCaptain",
           t.name as "teamName", t.slug as "teamSlug",
           t.short_name as "teamShortName", t.logo_url as "teamLogoUrl",
           l.slug as "leagueSlug"
    from players p
    left join teams t on t.id = p.team_id
    left join leagues l on l.id = t.league_id
    where p.id = ${playerId}
  `);
  return rows[0] ?? null;
}

export type PlayerMatch = {
  fixtureId: number;
  kickoffAt: Date | null;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  opponent: { name: string; slug: string };
  goals: { minute: number | null; isOwnGoal: boolean; isPenalty: boolean }[];
  cards: ("yellow" | "red")[];
  isMotm: boolean;
};

// The matches he actually played in, newest first, seen from his team's side
export async function getPlayerRecentMatches(
  playerId: number,
  seasonId: number,
  limit = 5,
): Promise<PlayerMatch[]> {
  const { rows } = await db.execute<RawKickoff<PlayerMatch>>(sql`
    select f.id as "fixtureId", to_json(f.kickoff_at) as "kickoffAt",
           (a.team_id = f.home_team_id) as "isHome",
           case when a.team_id = f.home_team_id then f.home_score else f.away_score end as "goalsFor",
           case when a.team_id = f.home_team_id then f.away_score else f.home_score end as "goalsAgainst",
           json_build_object('name', o.name, 'slug', o.slug) as opponent,
           coalesce((
             select json_agg(json_build_object(
                      'minute', g.minute, 'isOwnGoal', g.is_own_goal, 'isPenalty', g.is_penalty)
                    order by g.minute nulls last, g.id)
             from goals g
             where g.fixture_id = f.id and g.player_id = ${playerId}
           ), '[]'::json) as goals,
           coalesce((
             select json_agg(c.type order by c.minute nulls last, c.id)
             from cards c
             where c.fixture_id = f.id and c.player_id = ${playerId}
           ), '[]'::json) as cards,
           coalesce(f.motm_player_id = ${playerId}, false) as "isMotm"
    from appearances a
    join fixtures f on f.id = a.fixture_id
    join teams o on o.id = case when a.team_id = f.home_team_id then f.away_team_id else f.home_team_id end
    where a.player_id = ${playerId} and f.season_id = ${seasonId} and f.status = 'finished'
    order by f.kickoff_at desc, f.id desc
    limit ${limit}
  `);
  return rows.map((row) => ({ ...row, kickoffAt: toDate(row.kickoffAt) }));
}

export type LeagueCard = {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  tier: string | null;
  logoUrl: string | null;
  teamCount: number;
  isActive: boolean;
};

export async function getLeagueDirectory(): Promise<LeagueCard[]> {
  const { rows } = await db.execute<LeagueCard>(sql`
    select l.id, l.name, l.slug, l.region, l.tier, l.logo_url as "logoUrl",
           (select count(*) from teams t where t.league_id = l.id)::int as "teamCount",
           exists (select 1 from seasons s where s.league_id = l.id and s.is_current) as "isActive"
    from leagues l
    where l.is_listed
    order by l.name
  `);
  return rows;
}

export type TeamSearchRow = {
  name: string;
  slug: string;
  shortName: string | null;
  area: string | null;
  leagueName: string;
};

export async function getTeamsForSearch(): Promise<TeamSearchRow[]> {
  const { rows } = await db.execute<TeamSearchRow>(sql`
    select t.name, t.slug, t.short_name as "shortName", t.area, l.name as "leagueName"
    from teams t
    join leagues l on l.id = t.league_id
    where l.is_listed
    order by t.name
  `);
  return rows;
}

// Clubs first, then players. Players match on name and nickname, not on their club.
export async function getSearchIndex(leagueId: number): Promise<SearchItem[]> {
  const { rows } = await db.execute<SearchItem>(sql`
    select 'team:' || t.slug as key, 'team' as kind, '/team/' || t.slug as href,
           t.name as label, t.area as sub,
           concat_ws(' ', t.name, t.short_name, t.area) as terms
    from teams t
    where t.league_id = ${leagueId}
    union all
    select 'player:' || p.id, 'player', '/player/' || p.id,
           p.name, concat_ws(' • ', p.nickname, t.name),
           concat_ws(' ', p.name, p.nickname)
    from players p
    join teams t on t.id = p.team_id
    where t.league_id = ${leagueId} and p.status = 'active'
    order by kind desc, label
  `);
  return rows;
}
