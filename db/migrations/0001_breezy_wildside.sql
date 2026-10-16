CREATE TYPE "public"."card_type" AS ENUM('yellow', 'red');--> statement-breakpoint
CREATE TYPE "public"."fixture_status" AS ENUM('scheduled', 'finished', 'postponed');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."position" AS ENUM('GK', 'DF', 'MF', 'ST');--> statement-breakpoint
CREATE TABLE "appearances" (
	"fixture_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "appearances_fixture_id_player_id_pk" PRIMARY KEY("fixture_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fixture_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"type" "card_type" NOT NULL,
	"minute" smallint,
	CONSTRAINT "cards_minute_range" CHECK ("cards"."minute" between 1 and 130)
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"matchweek" smallint,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"kickoff_at" timestamp with time zone,
	"venue_id" integer,
	"status" "fixture_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" smallint,
	"away_score" smallint,
	"motm_player_id" integer,
	"sheet_photo_url" text,
	"result_entered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_teams_differ" CHECK ("fixtures"."home_team_id" <> "fixtures"."away_team_id"),
	CONSTRAINT "fixtures_scores_not_negative" CHECK ("fixtures"."home_score" >= 0 and "fixtures"."away_score" >= 0),
	CONSTRAINT "fixtures_finished_has_score" CHECK ("fixtures"."status" <> 'finished' or ("fixtures"."home_score" is not null and "fixtures"."away_score" is not null))
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "goals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fixture_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer,
	"minute" smallint,
	"is_own_goal" boolean DEFAULT false NOT NULL,
	"is_penalty" boolean DEFAULT false NOT NULL,
	CONSTRAINT "goals_minute_range" CHECK ("goals"."minute" between 1 and 130),
	CONSTRAINT "goals_og_not_penalty" CHECK (not ("goals"."is_own_goal" and "goals"."is_penalty"))
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer,
	"name" text NOT NULL,
	"nickname" text,
	"position" "position" NOT NULL,
	"jersey_number" smallint,
	"photo_url" text,
	"is_captain" boolean DEFAULT false NOT NULL,
	"status" "player_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_jersey_range" CHECK ("players"."jersey_number" between 1 and 99)
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seasons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"league_id" integer NOT NULL,
	"name" text NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"league_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_name" text,
	"logo_url" text,
	"area" text,
	"founded_year" smallint,
	"manager_name" text,
	"manager_photo_url" text,
	"home_venue_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "venues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"area" text,
	"directions" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_motm_player_id_players_id_fk" FOREIGN KEY ("motm_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_home_venue_id_venues_id_fk" FOREIGN KEY ("home_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appearances_player_idx" ON "appearances" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "cards_fixture_idx" ON "cards" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "cards_player_idx" ON "cards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "fixtures_season_kickoff_idx" ON "fixtures" USING btree ("season_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "goals_fixture_idx" ON "goals" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "goals_player_idx" ON "goals" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "players_team_idx" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_one_captain_per_team" ON "players" USING btree ("team_id") WHERE "players"."is_captain" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_league_name_uq" ON "seasons" USING btree ("league_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_one_current_per_league" ON "seasons" USING btree ("league_id") WHERE "seasons"."is_current" = true;--> statement-breakpoint
CREATE INDEX "teams_league_idx" ON "teams" USING btree ("league_id");