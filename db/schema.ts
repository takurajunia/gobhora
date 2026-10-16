import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  integer,
  smallint,
  text,
  boolean,
  date,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";

// Shared column helpers
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Enums
export const positionEnum = pgEnum("position", ["GK", "DF", "MF", "ST"]);
export const playerStatusEnum = pgEnum("player_status", ["active", "inactive"]);
export const fixtureStatusEnum = pgEnum("fixture_status", [
  "scheduled",
  "finished",
  "postponed",
]);
export const cardTypeEnum = pgEnum("card_type", ["yellow", "red"]);

// Leagues and seasons
export const leagues = pgTable("leagues", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortName: text("short_name"),
  region: text("region"),
  tier: text("tier"),
  logoUrl: text("logo_url"),
  createdAt: createdAt(),
});

export const seasons = pgTable(
  "seasons",
  {
    id: id(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    name: text("name").notNull(),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("seasons_league_name_uq").on(t.leagueId, t.name),
    uniqueIndex("seasons_one_current_per_league")
      .on(t.leagueId)
      .where(sql`${t.isCurrent} = true`),
  ],
);

// Venues and teams
export const venues = pgTable("venues", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  area: text("area"),
  directions: text("directions"),
  photoUrl: text("photo_url"),
  createdAt: createdAt(),
});

export const teams = pgTable(
  "teams",
  {
    id: id(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    shortName: text("short_name"),
    logoUrl: text("logo_url"),
    area: text("area"),
    foundedYear: smallint("founded_year"),
    managerName: text("manager_name"),
    managerPhotoUrl: text("manager_photo_url"),
    homeVenueId: integer("home_venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("teams_league_idx").on(t.leagueId)],
);

// Players
export const players = pgTable(
  "players",
  {
    id: id(),
    teamId: integer("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    nickname: text("nickname"),
    position: positionEnum("position").notNull(),
    jerseyNumber: smallint("jersey_number"),
    photoUrl: text("photo_url"),
    isCaptain: boolean("is_captain").notNull().default(false),
    status: playerStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    index("players_team_idx").on(t.teamId),
    uniqueIndex("players_one_captain_per_team")
      .on(t.teamId)
      .where(sql`${t.isCaptain} = true`),
    check("players_jersey_range", sql`${t.jerseyNumber} between 1 and 99`),
  ],
);

// Fixtures (a fixture becomes a result once finished)
export const fixtures = pgTable(
  "fixtures",
  {
    id: id(),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id),
    matchweek: smallint("matchweek"),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => teams.id),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => teams.id),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }),
    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    status: fixtureStatusEnum("status").notNull().default("scheduled"),
    homeScore: smallint("home_score"),
    awayScore: smallint("away_score"),
    motmPlayerId: integer("motm_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    sheetPhotoUrl: text("sheet_photo_url"),
    resultEnteredAt: timestamp("result_entered_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("fixtures_season_kickoff_idx").on(t.seasonId, t.kickoffAt),
    check("fixtures_teams_differ", sql`${t.homeTeamId} <> ${t.awayTeamId}`),
    check(
      "fixtures_scores_not_negative",
      sql`${t.homeScore} >= 0 and ${t.awayScore} >= 0`,
    ),
    check(
      "fixtures_finished_has_score",
      sql`${t.status} <> 'finished' or (${t.homeScore} is not null and ${t.awayScore} is not null)`,
    ),
  ],
);

// Match events: one row per goal, card and appearance
export const goals = pgTable(
  "goals",
  {
    id: id(),
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    playerId: integer("player_id").references(() => players.id),
    minute: smallint("minute"),
    isOwnGoal: boolean("is_own_goal").notNull().default(false),
    isPenalty: boolean("is_penalty").notNull().default(false),
  },
  (t) => [
    index("goals_fixture_idx").on(t.fixtureId),
    index("goals_player_idx").on(t.playerId),
    check("goals_minute_range", sql`${t.minute} between 1 and 130`),
    check("goals_og_not_penalty", sql`not (${t.isOwnGoal} and ${t.isPenalty})`),
  ],
);

export const cards = pgTable(
  "cards",
  {
    id: id(),
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    type: cardTypeEnum("type").notNull(),
    minute: smallint("minute"),
  },
  (t) => [
    index("cards_fixture_idx").on(t.fixtureId),
    index("cards_player_idx").on(t.playerId),
    check("cards_minute_range", sql`${t.minute} between 1 and 130`),
  ],
);

export const appearances = pgTable(
  "appearances",
  {
    fixtureId: integer("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
  },
  (t) => [
    primaryKey({ columns: [t.fixtureId, t.playerId] }),
    index("appearances_player_idx").on(t.playerId),
  ],
);
