CREATE TABLE "player_carryovers" (
	"season_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"goals" smallint DEFAULT 0 NOT NULL,
	"own_goals" smallint DEFAULT 0 NOT NULL,
	"yellow_cards" smallint,
	"red_cards" smallint DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "player_carryovers_season_id_player_id_team_id_pk" PRIMARY KEY("season_id","player_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "team_carryovers" (
	"season_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"played" smallint DEFAULT 0 NOT NULL,
	"won" smallint DEFAULT 0 NOT NULL,
	"drawn" smallint DEFAULT 0 NOT NULL,
	"lost" smallint DEFAULT 0 NOT NULL,
	"goals_for" smallint DEFAULT 0 NOT NULL,
	"goals_against" smallint DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "team_carryovers_season_id_team_id_pk" PRIMARY KEY("season_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "position" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "is_listed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "player_carryovers" ADD CONSTRAINT "player_carryovers_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_carryovers" ADD CONSTRAINT "player_carryovers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_carryovers" ADD CONSTRAINT "player_carryovers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_carryovers" ADD CONSTRAINT "team_carryovers_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_carryovers" ADD CONSTRAINT "team_carryovers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_carryovers_player_idx" ON "player_carryovers" USING btree ("player_id");