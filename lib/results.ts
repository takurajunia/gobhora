// The ONLY way results get into the database. The admin form and scripts both use this,
// so every result is checked the same way and stats can never be double counted.
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { appearances, cards, fixtures, goals, players } from "../db/schema";

export type GoalInput = {
  teamId: number; // the team that gets the goal on the scoreboard
  playerId: number | null; // null = unknown scorer
  minute?: number | null;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
};

export type CardInput = {
  teamId: number;
  playerId: number;
  type: "yellow" | "red";
  minute?: number | null;
};

export type AppearanceInput = { teamId: number; playerId: number };

export type ResultInput = {
  homeScore: number;
  awayScore: number;
  goals: GoalInput[];
  cards: CardInput[];
  appearances: AppearanceInput[];
  motmPlayerId?: number | null;
  sheetPhotoUrl?: string | null; // leave out to keep the existing photo
};

// Errors meant to be shown to the admin as-is
export class ResultError extends Error {}

export async function saveMatchResult(fixtureId: number, input: ResultInput) {
  return db.transaction(async (tx) => {
    const [fixture] = await tx
      .select()
      .from(fixtures)
      .where(eq(fixtures.id, fixtureId))
      .for("update");
    if (!fixture) throw new ResultError(`Fixture ${fixtureId} does not exist`);

    const { homeTeamId, awayTeamId } = fixture;
    const playingTeams = new Set([homeTeamId, awayTeamId]);
    const opponentOf = (teamId: number) =>
      teamId === homeTeamId ? awayTeamId : homeTeamId;

    // 1. Scores
    for (const score of [input.homeScore, input.awayScore]) {
      if (!Number.isInteger(score) || score < 0 || score > 30) {
        throw new ResultError("Scores must be whole numbers from 0 to 30");
      }
    }

    // 2. Which side is every mentioned player on in THIS match?
    //    The lineup if they're in it, otherwise their current team.
    const mentioned = [
      ...input.goals.map((g) => g.playerId),
      ...input.cards.map((c) => c.playerId),
      ...input.appearances.map((a) => a.playerId),
      input.motmPlayerId,
    ].filter((id): id is number => typeof id === "number");
    const playerIds = [...new Set(mentioned)];

    const found = playerIds.length
      ? await tx
          .select({ id: players.id, teamId: players.teamId })
          .from(players)
          .where(inArray(players.id, playerIds))
      : [];
    const currentTeam = new Map(found.map((p) => [p.id, p.teamId] as const));
    const missing = playerIds.find((id) => !currentTeam.has(id));
    if (missing !== undefined)
      throw new ResultError(`Player ${missing} does not exist`);

    const lineup = new Map<number, number>(); // playerId -> teamId
    for (const a of input.appearances) {
      if (!playingTeams.has(a.teamId)) {
        throw new ResultError("A player in the lineup is not on either team");
      }
      lineup.set(a.playerId, a.teamId);
    }
    const sideOf = (playerId: number) =>
      lineup.get(playerId) ?? currentTeam.get(playerId) ?? null;

    // 3. Goals must add up to the score and belong to the right players
    for (const g of input.goals) {
      if (!playingTeams.has(g.teamId)) {
        throw new ResultError(
          "A goal is credited to a team that isn't playing",
        );
      }
      if (g.isOwnGoal && g.isPenalty) {
        throw new ResultError("A goal can't be both an own goal and a penalty");
      }
      if (g.isOwnGoal && g.playerId === null) {
        throw new ResultError("An own goal needs the player who scored it");
      }
      if (g.minute != null && (g.minute < 1 || g.minute > 130)) {
        throw new ResultError("Goal minutes must be from 1 to 130");
      }
      if (g.playerId !== null) {
        const expectedSide = g.isOwnGoal ? opponentOf(g.teamId) : g.teamId;
        if (sideOf(g.playerId) !== expectedSide) {
          throw new ResultError(
            `Player ${g.playerId} is on the wrong side for one of the goals`,
          );
        }
      }
    }
    const homeGoals = input.goals.filter((g) => g.teamId === homeTeamId).length;
    const awayGoals = input.goals.filter((g) => g.teamId === awayTeamId).length;
    if (homeGoals !== input.homeScore || awayGoals !== input.awayScore) {
      throw new ResultError(
        `Goals entered (${homeGoals}-${awayGoals}) don't match the score (${input.homeScore}-${input.awayScore})`,
      );
    }

    // 4. Cards
    for (const c of input.cards) {
      if (!playingTeams.has(c.teamId) || sideOf(c.playerId) !== c.teamId) {
        throw new ResultError(
          `Player ${c.playerId} is on the wrong side for one of the cards`,
        );
      }
      if (c.minute != null && (c.minute < 1 || c.minute > 130)) {
        throw new ResultError("Card minutes must be from 1 to 130");
      }
    }

    // 5. Anyone who scored, was booked or won Man of the Match obviously played
    for (const playerId of mentioned) {
      if (lineup.has(playerId)) continue;
      const side = sideOf(playerId);
      if (side === null || !playingTeams.has(side)) {
        throw new ResultError(
          `Player ${playerId} doesn't play for either team`,
        );
      }
      lineup.set(playerId, side);
    }

    // 6. Save: replace this match's events completely, so an edit never double counts
    const update: Partial<typeof fixtures.$inferInsert> = {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: "finished",
      motmPlayerId: input.motmPlayerId ?? null,
      resultEnteredAt: new Date(),
    };
    if (input.sheetPhotoUrl !== undefined)
      update.sheetPhotoUrl = input.sheetPhotoUrl;
    await tx.update(fixtures).set(update).where(eq(fixtures.id, fixtureId));

    await tx.delete(goals).where(eq(goals.fixtureId, fixtureId));
    await tx.delete(cards).where(eq(cards.fixtureId, fixtureId));
    await tx.delete(appearances).where(eq(appearances.fixtureId, fixtureId));

    if (input.goals.length > 0) {
      await tx.insert(goals).values(
        input.goals.map((g) => ({
          fixtureId,
          teamId: g.teamId,
          playerId: g.playerId,
          minute: g.minute ?? null,
          isOwnGoal: g.isOwnGoal ?? false,
          isPenalty: g.isPenalty ?? false,
        })),
      );
    }
    if (input.cards.length > 0) {
      await tx.insert(cards).values(
        input.cards.map((c) => ({
          fixtureId,
          teamId: c.teamId,
          playerId: c.playerId,
          type: c.type,
          minute: c.minute ?? null,
        })),
      );
    }
    if (lineup.size > 0) {
      await tx
        .insert(appearances)
        .values(
          [...lineup].map(([playerId, teamId]) => ({
            fixtureId,
            playerId,
            teamId,
          })),
        );
    }

    return { fixtureId, seasonId: fixture.seasonId, homeTeamId, awayTeamId };
  });
}
