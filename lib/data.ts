// Cached versions of the stats queries for pages to use.
// Results only change when an admin saves one, so these are cached "forever" and the
// save clears the season's tag (updateTag), so the next visitor gets fresh numbers.
import { cacheLife, cacheTag } from "next/cache";
import * as stats from "./stats";

export const leagueTag = (slug: string) => `league:${slug}`;
export const seasonTag = (seasonId: number) => `season:${seasonId}`;

export async function getLeague(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(leagueTag(slug));
  return stats.getCurrentSeason(slug);
}

export async function getLeagueTable(seasonId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getLeagueTable(seasonId);
}

export async function getRecentResults(seasonId: number, limit?: number) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getRecentResults(seasonId, limit);
}

export async function getUpcomingFixtures(seasonId: number, limit?: number) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getUpcomingFixtures(seasonId, limit);
}

export async function getTopScorers(seasonId: number, limit?: number) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getTopScorers(seasonId, limit);
}

export async function getMotmLeaders(seasonId: number, limit?: number) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getMotmLeaders(seasonId, limit);
}
