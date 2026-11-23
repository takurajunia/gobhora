// One-off import of the real SAZSL from Lu6er's stats sheet (db/real/sazsl-stats.xlsx).
// Clubs and players come from the sheet; its season totals become carried-over totals,
// which results entered in GoBhora add on top of. Re-import only BEFORE admins start entering results.
//   npm run db:import-sazsl        refuses if SAZSL already exists
//   npm run db:import-sazsl:reset  deletes SAZSL (only) and imports again (ALLOW_DB_RESET=true only)
import { Workbook, type CellValue } from "exceljs";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { leagues, playerCarryovers, players, seasons, teams } from "../schema";
import { deleteLeague } from "./delete-league";

const FILE = "db/real/sazsl-stats.xlsx";
const SOURCE = "Stats sheet: Statistic Tracker-7";
// TODO: full league name from Lu6er
const LEAGUE = {
  name: "SAZSL",
  slug: "sazsl",
  shortName: "SAZSL",
  region: "Harare",
  tier: null,
};
const SEASON = { name: "2026", isCurrent: true };

type Columns = { player: number; club: number; count: number };
type SheetRow = { player: string; club: string; count: number };
type Tally = {
  rawName: string; // as written in the sheet, e.g. "Blessing (Mabhule)"
  name: string;
  nickname: string | null;
  clubKey: string;
  goals: number;
  ownGoals: number;
  redCards: number;
};

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

// exceljs's cell.text crashes on some cells (e.g. a formula with no result), so convert values ourselves
function cellToText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if ("richText" in value)
    return value.richText.map((part) => part.text).join(""); // mixed formatting
  if ("hyperlink" in value) return String(value.text ?? "");
  if ("formula" in value || "sharedFormula" in value) {
    const result = (value as { result?: CellValue }).result;
    return result === undefined || result === null ? "" : cellToText(result);
  }
  return ""; // error cells such as #N/A
}

const key = (text: string) => clean(text).toLowerCase();
const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// "Blessing (Mabhule)" -> name "Blessing", nickname "Mabhule"
function splitNickname(raw: string) {
  const match = raw.match(/^(.+?)\s*\((.+)\)$/);
  return match
    ? { name: clean(match[1]), nickname: clean(match[2]) }
    : { name: raw, nickname: null };
}

// Number of single-letter changes between two words ("aturo" -> "arturo" is 1)
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

// Finds the "Player | Club | <count>" header row wherever it sits, then reads the rows under it
function readSheet(
  workbook: Workbook,
  sheetName: string,
  countHeader: string,
): SheetRow[] {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`the workbook has no "${sheetName}" sheet`);

  const header: { columns: Columns | null } = { columns: null };
  const rows: SheetRow[] = [];
  const problems: string[] = [];

  sheet.eachRow((row, line) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col] = clean(cellToText(cell.value));
    });

    const columns = header.columns;
    if (!columns) {
      const find = (name: string) =>
        cells.findIndex((c) => c?.toLowerCase() === name);
      const found = {
        player: find("player"),
        club: find("club"),
        count: find(countHeader),
      };
      if (found.player > 0 && found.club > 0 && found.count > 0)
        header.columns = found;
      return;
    }

    const player = cells[columns.player] ?? "";
    if (!player) return; // the empty numbered rows at the bottom of a sheet
    const club = cells[columns.club] ?? "";
    const count = Number(cells[columns.count]);
    if (!club)
      problems.push(`${sheetName} row ${line}: "${player}" has no club`);
    else if (!Number.isInteger(count) || count < 1)
      problems.push(
        `${sheetName} row ${line}: "${player}" has "${cells[columns.count] ?? ""}" instead of a number`,
      );
    else rows.push({ player, club, count });
  });

  if (!header.columns) {
    throw new Error(
      `couldn't find the Player / Club / ${countHeader} header row in "${sheetName}"`,
    );
  }
  if (problems.length > 0)
    throw new Error(`fix these in the sheet:\n  ${problems.join("\n  ")}`);
  return rows;
}

async function main() {
  const reset = process.argv.includes("--reset");
  console.log(
    `Database: ${new URL(process.env.DATABASE_URL ?? "postgres://not-set").host}`,
  );

  // 1. Read the three sheets and add everything up per player
  const workbook = new Workbook();
  await workbook.xlsx.readFile(FILE);

  const clubs = new Map<string, string>(); // key -> club name as first written
  const tallies = new Map<string, Tally>(); // "club|player" -> totals
  const warnings: string[] = [];

  function addSheet(
    sheetName: string,
    countHeader: string,
    field: "goals" | "ownGoals" | "redCards",
  ) {
    const seen = new Set<string>();
    for (const row of readSheet(workbook, sheetName, countHeader)) {
      const clubKey = key(row.club);
      if (!clubs.has(clubKey)) clubs.set(clubKey, row.club);

      const playerKey = `${clubKey}|${key(row.player)}`;
      if (seen.has(playerKey)) {
        warnings.push(
          `${row.player} (${clubs.get(clubKey)}) is listed more than once in ${sheetName}: the rows were added together`,
        );
      }
      seen.add(playerKey);

      let tally = tallies.get(playerKey);
      if (!tally) {
        tally = {
          rawName: row.player,
          ...splitNickname(row.player),
          clubKey,
          goals: 0,
          ownGoals: 0,
          redCards: 0,
        };
        tallies.set(playerKey, tally);
      }
      tally[field] += row.count;
    }
  }
  addSheet("GOALS", "goals", "goals");
  addSheet("OG", "number", "ownGoals");
  addSheet("RC", "number", "redCards");

  // 2. Possible duplicates and transfers, for Lu6er to confirm (reported, not changed)
  const all = [...tallies.values()];
  const byName = new Map<string, { name: string; clubKeys: Set<string> }>();
  for (const t of all) {
    const entry = byName.get(key(t.rawName)) ?? {
      name: t.rawName,
      clubKeys: new Set<string>(),
    };
    entry.clubKeys.add(t.clubKey);
    byName.set(key(t.rawName), entry);
  }
  for (const { name, clubKeys } of byName.values()) {
    if (clubKeys.size === 2) {
      const names = [...clubKeys].map((k) => clubs.get(k)).join(" and ");
      warnings.push(
        `"${name}" appears at ${names}: a transfer, or two different players?`,
      );
    }
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.clubKey !== b.clubKey) continue;
      const an = key(a.name);
      const bn = key(b.name);
      const similar =
        Math.min(an.length, bn.length) >= 4 && editDistance(an, bn) <= 2;
      const nicknameMatch =
        key(a.nickname ?? "") === bn || key(b.nickname ?? "") === an;
      if (similar || nicknameMatch) {
        warnings.push(
          `"${a.rawName}" and "${b.rawName}" (${clubs.get(a.clubKey)}): the same player?`,
        );
      }
    }
  }

  // 3. Refuse to import twice, unless resetting
  const [existing] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.slug, LEAGUE.slug));
  if (existing && !reset) {
    throw new Error(
      "SAZSL already exists. To delete it and import again, run: npm run db:import-sazsl:reset",
    );
  }
  if (reset && process.env.ALLOW_DB_RESET !== "true") {
    throw new Error(
      "reset refused, because ALLOW_DB_RESET=true is not set for this database",
    );
  }

  // 4. Save everything in one transaction: all or nothing
  await db.transaction(async (tx) => {
    if (reset) await deleteLeague(tx, LEAGUE.slug);

    const [league] = await tx
      .insert(leagues)
      .values(LEAGUE)
      .returning({ id: leagues.id });
    const [season] = await tx
      .insert(seasons)
      .values({ ...SEASON, leagueId: league.id })
      .returning({ id: seasons.id });

    const insertedTeams = await tx
      .insert(teams)
      .values(
        [...clubs.values()]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ leagueId: league.id, name, slug: slugify(name) })),
      )
      .returning({ id: teams.id, name: teams.name });
    const teamIdByKey = new Map(
      insertedTeams.map((t) => [key(t.name), t.id] as const),
    );
    const clubKeyByTeamId = new Map(
      insertedTeams.map((t) => [t.id, key(t.name)] as const),
    );

    await tx.insert(players).values(
      all.map((t) => ({
        teamId: teamIdByKey.get(t.clubKey)!,
        name: t.name,
        nickname: t.nickname,
      })),
    );

    // Read the new players back to get their ids (doesn't rely on insert order)
    const saved = await tx
      .select({
        id: players.id,
        teamId: players.teamId,
        name: players.name,
        nickname: players.nickname,
      })
      .from(players)
      .where(
        inArray(
          players.teamId,
          insertedTeams.map((t) => t.id),
        ),
      );
    const playerIdByKey = new Map(
      saved.map((p) => {
        const raw = p.nickname ? `${p.name} (${p.nickname})` : p.name;
        return [`${clubKeyByTeamId.get(p.teamId!)}|${key(raw)}`, p.id] as const;
      }),
    );

    await tx.insert(playerCarryovers).values(
      all.map((t) => ({
        seasonId: season.id,
        playerId: playerIdByKey.get(`${t.clubKey}|${key(t.rawName)}`)!,
        teamId: teamIdByKey.get(t.clubKey)!,
        goals: t.goals,
        ownGoals: t.ownGoals,
        redCards: t.redCards,
        source: SOURCE,
      })),
    );
  });

  // 5. Count what is actually in the database now
  const { rows } = await db.execute(sql`
    select count(distinct c.team_id)::int as clubs,
           count(*)::int as players,
           coalesce(sum(c.goals), 0)::int as goals,
           coalesce(sum(c.own_goals), 0)::int as "ownGoals",
           coalesce(sum(c.red_cards), 0)::int as "redCards"
    from player_carryovers c
    join seasons s on s.id = c.season_id
    join leagues l on l.id = s.league_id
    where l.slug = ${LEAGUE.slug}
  `);
  console.log(
    reset ? "✓ Deleted and re-imported SAZSL:" : "✓ Imported SAZSL:",
    rows[0],
  );

  console.log("\nTop scorers in the sheet:");
  [...all]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)
    .forEach((t, i) =>
      console.log(
        `  ${i + 1}. ${t.rawName} (${clubs.get(t.clubKey)}): ${t.goals}`,
      ),
    );

  if (warnings.length > 0) {
    console.log(`\nCheck with Lu6er (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main()
  .catch((error) => {
    console.error(`✗ Import failed: ${error.cause?.message ?? error.message}`);
    if (
      !error.message?.startsWith("fix these") &&
      !error.message?.includes("already exists")
    ) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
