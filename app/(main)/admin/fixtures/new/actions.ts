"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, teams, venues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminLeagues } from "@/lib/admin";
import { seasonTag } from "@/lib/data";

export type FixtureFormState = { error: string | null };

const ZIMBABWE = "+02:00";

export async function createFixture(
  _prev: FixtureFormState,
  formData: FormData,
): Promise<FixtureFormState> {
  // Server actions can be called directly, so check the login and the league every time
  const admin = await requireAdmin();
  const get = (name: string) => String(formData.get(name) ?? "").trim();

  const league = (await getAdminLeagues(admin)).find(
    (l) => l.slug === get("league"),
  );
  if (!league) return { error: "You can't add fixtures to that league" };

  const homeId = Number(get("home"));
  const awayId = Number(get("away"));
  if (!homeId || !awayId) return { error: "Choose both teams" };
  if (homeId === awayId) return { error: "A team can't play itself" };

  const date = get("date");
  const time = get("time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: "Choose a date and a kick-off time" };
  }
  const kickoffAt = new Date(`${date}T${time}:00${ZIMBABWE}`);
  if (Number.isNaN(kickoffAt.getTime()))
    return { error: "That date doesn't exist" };

  const matchweekText = get("matchweek");
  const matchweek = matchweekText ? Number(matchweekText) : null;
  if (
    matchweek !== null &&
    !(Number.isInteger(matchweek) && matchweek >= 1 && matchweek <= 99)
  ) {
    return { error: "Matchweek must be a number from 1 to 99" };
  }

  const venueText = get("venue");
  const venueId = venueText ? Number(venueText) : null;
  if (venueId !== null) {
    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.id, venueId));
    if (!venue) return { error: "That venue doesn't exist" };
  }

  const playing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.leagueId, league.leagueId),
        or(eq(teams.id, homeId), eq(teams.id, awayId)),
      ),
    );
  if (playing.length !== 2)
    return { error: "Both teams must be in this league" };

  // A team playing twice on the same day is almost always a double entry
  const dayStart = new Date(`${date}T00:00:00${ZIMBABWE}`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const [clash] = await db
    .select({ id: fixtures.id })
    .from(fixtures)
    .where(
      and(
        eq(fixtures.seasonId, league.seasonId),
        gte(fixtures.kickoffAt, dayStart),
        lt(fixtures.kickoffAt, dayEnd),
        or(
          eq(fixtures.homeTeamId, homeId),
          eq(fixtures.awayTeamId, homeId),
          eq(fixtures.homeTeamId, awayId),
          eq(fixtures.awayTeamId, awayId),
        ),
      ),
    );
  if (clash)
    return { error: "One of these teams already has a match that day" };

  await db.insert(fixtures).values({
    seasonId: league.seasonId,
    matchweek,
    homeTeamId: homeId,
    awayTeamId: awayId,
    kickoffAt,
    venueId,
  });

  // The public Fixtures and team pages show it on the next visit
  updateTag(seasonTag(league.seasonId));
  redirect(`/admin?league=${league.slug}`);
}
