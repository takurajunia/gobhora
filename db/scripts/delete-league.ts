import { sql } from "drizzle-orm";
import type { db } from "../index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Deletes ONE league and everything that belongs to it. Fails (and rolls back) if an
// admin account is still linked to the league, rather than deleting the admin.
export async function deleteLeague(tx: Tx, slug: string) {
  const seasonIds = sql`(select s.id from seasons s join leagues l on l.id = s.league_id where l.slug = ${slug})`;
  const teamIds = sql`(select t.id from teams t join leagues l on l.id = t.league_id where l.slug = ${slug})`;

  await tx.execute(
    sql`delete from player_carryovers where season_id in ${seasonIds}`,
  );
  await tx.execute(
    sql`delete from team_carryovers where season_id in ${seasonIds}`,
  );
  await tx.execute(sql`delete from fixtures where season_id in ${seasonIds}`); // goals, cards, appearances go with them
  await tx.execute(sql`delete from players where team_id in ${teamIds}`);
  await tx.execute(sql`delete from teams where id in ${teamIds}`);
  await tx.execute(sql`delete from seasons where id in ${seasonIds}`);
  await tx.execute(sql`delete from leagues where slug = ${slug}`);
}
