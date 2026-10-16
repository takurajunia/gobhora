// Imports the CSV files in db/seed/ into the database.
//   npm run db:seed        first import (refuses if data already exists)
//   npm run db:seed:reset  wipes ALL data, then imports (only where ALLOW_DB_RESET=true)
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { count, sql } from "drizzle-orm";
import { db } from "../index";
import {
  fixtures,
  leagues,
  players,
  positionEnum,
  seasons,
  teams,
  venues,
} from "../schema";

const SEED_DIR = "db/seed";
const TIMEZONE = "+02:00"; // Zimbabwe time, no daylight saving

// TODO: confirm the league's full name and details with Lu6er
const LEAGUE = {
  name: "SAZSL",
  slug: "sazsl",
  shortName: "SAZSL",
  region: "Harare",
  tier: "Premier Tier",
};
const SEASON = {
  name: "2026",
  startsOn: "2026-07-04",
  endsOn: "2026-11-28",
  isCurrent: true,
};

type Row = Record<string, string>;
type Position = (typeof positionEnum.enumValues)[number];

const POSITIONS: Record<string, Position> = {
  gk: "GK",
  goalkeeper: "GK",
  keeper: "GK",
  df: "DF",
  def: "DF",
  defender: "DF",
  mf: "MF",
  mid: "MF",
  midfielder: "MF",
  st: "ST",
  fw: "ST",
  forward: "ST",
  striker: "ST",
};

const key = (text = "") => text.trim().toLowerCase();
const toInt = (text = "") => (text ? Number(text) : null);
const isYes = (text = "") => ["yes", "y", "true", "1"].includes(key(text));
const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function readCsv(file: string): Row[] {
  return parse(readFileSync(`${SEED_DIR}/${file}`), {
    columns: (header: string[]) => header.map((h) => key(h)),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

async function main() {
  const reset = process.argv.includes("--reset");
  console.log(
    `Database: ${new URL(process.env.DATABASE_URL ?? "postgres://not-set").host}`,
  );

  // 1. Read and check every file before touching the database
  const venueRows = readCsv("venues.csv");
  const teamRows = readCsv("teams.csv");
  const playerRows = readCsv("players.csv");
  const fixtureRows = readCsv("fixtures.csv");

  const errors: string[] = [];
  const problem = (file: string, index: number, message: string) => {
    errors.push(`${file} line ${index + 2}: ${message}`);
  };

  const venueKeys = new Set<string>();
  venueRows.forEach((v, i) => {
    if (!v.name) return problem("venues.csv", i, "name is empty");
    if (venueKeys.has(key(v.name)))
      return problem("venues.csv", i, `duplicate venue "${v.name}"`);
    venueKeys.add(key(v.name));
  });

  const teamKeys = new Set<string>();
  const teamSlugs = new Set<string>();
  teamRows.forEach((t, i) => {
    if (!t.name) return problem("teams.csv", i, "name is empty");
    if (teamKeys.has(key(t.name)))
      return problem("teams.csv", i, `duplicate team "${t.name}"`);
    if (teamSlugs.has(slugify(t.name)))
      return problem(
        "teams.csv",
        i,
        `"${t.name}" would get the same web address as another team`,
      );
    if (t.home_venue && !venueKeys.has(key(t.home_venue)))
      problem("teams.csv", i, `unknown venue "${t.home_venue}"`);
    const founded = toInt(t.founded_year);
    if (founded !== null && !Number.isInteger(founded))
      problem("teams.csv", i, `founded_year "${t.founded_year}" is not a year`);
    teamKeys.add(key(t.name));
    teamSlugs.add(slugify(t.name));
  });

  const captainTeams = new Set<string>();
  playerRows.forEach((p, i) => {
    if (!p.name) problem("players.csv", i, "name is empty");
    if (!teamKeys.has(key(p.team)))
      problem("players.csv", i, `unknown team "${p.team ?? ""}"`);
    if (!POSITIONS[key(p.position)])
      problem(
        "players.csv",
        i,
        `unknown position "${p.position ?? ""}" (use GK, DF, MF or ST)`,
      );
    const jersey = toInt(p.jersey);
    if (
      jersey !== null &&
      !(Number.isInteger(jersey) && jersey >= 1 && jersey <= 99)
    )
      problem(
        "players.csv",
        i,
        `jersey "${p.jersey}" must be a number from 1 to 99`,
      );
    if (isYes(p.captain)) {
      if (captainTeams.has(key(p.team)))
        problem("players.csv", i, `second captain for "${p.team}"`);
      captainTeams.add(key(p.team));
    }
  });

  fixtureRows.forEach((f, i) => {
    if (!Number.isInteger(toInt(f.matchweek)))
      problem(
        "fixtures.csv",
        i,
        `matchweek "${f.matchweek ?? ""}" is not a number`,
      );
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date ?? ""))
      problem(
        "fixtures.csv",
        i,
        `date "${f.date ?? ""}" must look like 2026-07-04`,
      );
    if (!/^\d{1,2}:\d{2}$/.test(f.time ?? ""))
      problem("fixtures.csv", i, `time "${f.time ?? ""}" must look like 15:00`);
    if (!teamKeys.has(key(f.home)))
      problem("fixtures.csv", i, `unknown home team "${f.home ?? ""}"`);
    if (!teamKeys.has(key(f.away)))
      problem("fixtures.csv", i, `unknown away team "${f.away ?? ""}"`);
    if (key(f.home) === key(f.away))
      problem("fixtures.csv", i, "home and away are the same team");
    if (f.venue && !venueKeys.has(key(f.venue)))
      problem("fixtures.csv", i, `unknown venue "${f.venue}"`);
  });

  if (errors.length > 0) {
    throw new Error(
      `fix these ${errors.length} problem(s) in the CSV files:\n  ${errors.join("\n  ")}`,
    );
  }

  // 2. Refuse to import twice, unless resetting
  const [{ value: existingLeagues }] = await db
    .select({ value: count() })
    .from(leagues);
  if (existingLeagues > 0 && !reset) {
    throw new Error(
      "data already exists. To wipe it and import again, run: npm run db:seed:reset",
    );
  }
  if (reset && process.env.ALLOW_DB_RESET !== "true") {
    throw new Error(
      "reset refused, because ALLOW_DB_RESET=true is not set for this database",
    );
  }

  // 3. Import everything in one transaction: all or nothing
  await db.transaction(async (tx) => {
    if (reset) {
      await tx.execute(
        sql`truncate table appearances, cards, goals, fixtures, players, teams, venues, seasons, leagues restart identity cascade`,
      );
    }

    const [league] = await tx
      .insert(leagues)
      .values(LEAGUE)
      .returning({ id: leagues.id });
    const [season] = await tx
      .insert(seasons)
      .values({ ...SEASON, leagueId: league.id })
      .returning({ id: seasons.id });

    const insertedVenues = await tx
      .insert(venues)
      .values(
        venueRows.map((v) => ({
          name: v.name,
          slug: slugify(v.name),
          area: v.area || null,
          directions: v.directions || null,
        })),
      )
      .returning({ id: venues.id, name: venues.name });
    const venueIds = new Map(
      insertedVenues.map((v) => [key(v.name), v.id] as const),
    );
    const venueId = (name = "") => venueIds.get(key(name)) ?? null;

    const insertedTeams = await tx
      .insert(teams)
      .values(
        teamRows.map((t) => ({
          leagueId: league.id,
          name: t.name,
          slug: slugify(t.name),
          shortName: t.short_name || null,
          area: t.area || null,
          foundedYear: toInt(t.founded_year),
          managerName: t.manager_name || null,
          homeVenueId: venueId(t.home_venue),
        })),
      )
      .returning({ id: teams.id, name: teams.name });
    const teamIds = new Map(
      insertedTeams.map((t) => [key(t.name), t.id] as const),
    );
    const teamId = (name = "") => teamIds.get(key(name))!;

    await tx.insert(players).values(
      playerRows.map((p) => ({
        teamId: teamId(p.team),
        name: p.name,
        position: POSITIONS[key(p.position)],
        jerseyNumber: toInt(p.jersey),
        photoUrl: p.photo || null,
        isCaptain: isYes(p.captain),
      })),
    );

    await tx.insert(fixtures).values(
      fixtureRows.map((f) => {
        const [hour, minute] = f.time.split(":");
        return {
          seasonId: season.id,
          matchweek: toInt(f.matchweek),
          homeTeamId: teamId(f.home),
          awayTeamId: teamId(f.away),
          kickoffAt: new Date(
            `${f.date}T${hour.padStart(2, "0")}:${minute}:00${TIMEZONE}`,
          ),
          venueId: venueId(f.venue),
        };
      }),
    );
  });

  // 4. Count what is actually in the database now
  const { rows } = await db.execute(sql`
    select (select count(*) from venues)::int as venues,
           (select count(*) from teams)::int as teams,
           (select count(*) from players)::int as players,
           (select count(*) from fixtures)::int as fixtures
  `);
  console.log(reset ? "✓ Wiped and re-imported:" : "✓ Seed complete:", rows[0]);
}

main()
  .catch((error) => {
    console.error(`✗ Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
