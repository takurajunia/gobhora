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

export async function getRecentResults(
  seasonId: number,
  limit?: number,
  teamId?: number,
) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getRecentResults(seasonId, limit, teamId);
}

export async function getUpcomingFixtures(
  seasonId: number,
  limit?: number,
  teamId?: number,
) {
  "use cache";
  cacheLife("max");
  cacheTag(seasonTag(seasonId));
  return stats.getUpcomingFixtures(seasonId, limit, teamId);
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

// Team details change when an admin edits the club; the squad changes with results and player edits
export const teamTag = (slug: string) => `team:${slug}`;
export const squadTag = (teamId: number) => `squad:${teamId}`;

export async function getTeam(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(teamTag(slug));
  return stats.getTeamBySlug(slug);
}

export async function getSquad(teamId: number, seasonId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(squadTag(teamId), seasonTag(seasonId));
  return stats.getSquad(teamId, seasonId);
}

// Player details change when an admin edits him; his stats change with results
export const playerTag = (playerId: number) => `player:${playerId}`;

export async function getPlayer(playerId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(playerTag(playerId));
  return stats.getPlayerProfile(playerId);
}

export async function getPlayerSeasonStats(playerId: number, seasonId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(playerTag(playerId), seasonTag(seasonId));
  return stats.getPlayerSeasonStats(playerId, seasonId);
}

export async function getPlayerRecentMatches(
  playerId: number,
  seasonId: number,
  limit?: number,
) {
  "use cache";
  cacheLife("max");
  cacheTag(playerTag(playerId), seasonTag(seasonId));
  return stats.getPlayerRecentMatches(playerId, seasonId, limit);
}

// Welcome page and search lists: cleared by the admin when leagues, teams or players change
export const directoryTag = "directory";
export const searchTag = (leagueId: number) => `search:${leagueId}`;

export async function getLeagueDirectory() {
  "use cache";
  cacheLife("max");
  cacheTag(directoryTag);
  return stats.getLeagueDirectory();
}

export async function getTeamsForSearch() {
  "use cache";
  cacheLife("max");
  cacheTag(directoryTag);
  return stats.getTeamsForSearch();
}

export async function getSearchIndex(leagueId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(searchTag(leagueId));
  return stats.getSearchIndex(leagueId);
}
