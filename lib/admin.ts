// Live queries for the admin side. Never cached: admins must always see the current state.
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, leagues, seasons, teams, venues } from "@/db/schema";
import { DEFAULT_LEAGUE } from "./config";
import type { CurrentAdmin } from "./auth/session";

export type AdminLeague = {
  leagueId: number;
  slug: string;
  name: string;
  seasonId: number;
};

// The leagues this admin may manage, each with its current season
export async function getAdminLeagues(
  admin: CurrentAdmin,
): Promise<AdminLeague[]> {
  const rows = await db
    .select({
      leagueId: leagues.id,
      slug: leagues.slug,
      name: leagues.name,
      seasonId: seasons.id,
    })
    .from(leagues)
    .innerJoin(
      seasons,
      and(eq(seasons.leagueId, leagues.id), eq(seasons.isCurrent, true)),
    )
    .orderBy(asc(leagues.name));
  return admin.role === "master"
    ? rows
    : rows.filter((l) => l.leagueId === admin.leagueId);
}

// The league from ?league=, if this admin may manage it; otherwise the default or their only league
export function pickLeague(list: AdminLeague[], requested?: string) {
  return (
    list.find((l) => l.slug === requested) ??
    list.find((l) => l.slug === DEFAULT_LEAGUE) ??
    list[0] ??
    null
  );
}

export async function getLeagueTeams(leagueId: number) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(asc(teams.name));
}

export async function getVenues() {
  return db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .orderBy(asc(venues.name));
}

// Scheduled matches whose kick-off has passed. Postgres's clock decides,
// so pages never read the time while rendering.
export async function getDueFixtureIds(seasonId: number) {
  const rows = await db
    .select({ id: fixtures.id })
    .from(fixtures)
    .where(
      and(
        eq(fixtures.seasonId, seasonId),
        eq(fixtures.status, "scheduled"),
        lt(fixtures.kickoffAt, sql`now()`),
      ),
    );
  return new Set(rows.map((r) => r.id));
}
