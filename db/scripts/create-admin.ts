// Creates an admin, or resets an existing one (same phone): new password, unlocked, logged out everywhere.
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { admins, leagues, sessions } from "../schema";
import { hashPassword } from "../../lib/auth/password";
import { normalizePhone } from "../../lib/auth/phone";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = (await rl.question("Name: ")).trim();
    if (!name) throw new Error("a name is required");

    const phone = normalizePhone(await rl.question("Phone number: "));
    if (!phone)
      throw new Error("that isn't a Zimbabwe mobile number (like 0771234567)");

    const roleAnswer =
      (await rl.question("Role, master or league [league]: "))
        .trim()
        .toLowerCase() || "league";
    if (roleAnswer !== "master" && roleAnswer !== "league") {
      throw new Error('role must be "master" or "league"');
    }
    const role = roleAnswer as "master" | "league";

    let leagueId: number | null = null;
    if (role === "league") {
      const slug =
        (await rl.question("League slug [sazsl]: ")).trim() || "sazsl";
      const [league] = await db
        .select({ id: leagues.id })
        .from(leagues)
        .where(eq(leagues.slug, slug));
      if (!league) throw new Error(`no league with slug "${slug}"`);
      leagueId = league.id;
    }

    const password = randomBytes(9).toString("base64url"); // 12 characters
    const passwordHash = await hashPassword(password);

    const [saved] = await db
      .insert(admins)
      .values({ name, phone, passwordHash, role, leagueId })
      .onConflictDoUpdate({
        target: admins.phone,
        set: {
          name,
          passwordHash,
          role,
          leagueId,
          failedLogins: 0,
          lockedUntil: null,
        },
      })
      .returning({ id: admins.id });
    await db.delete(sessions).where(eq(sessions.adminId, saved.id));

    console.log(`\n✓ Admin saved: ${name} (${role}), phone ${phone}`);
    console.log(`  Password: ${password}`);
    console.log("  It's shown only once. Send it to them privately.");
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error(`✗ ${error.cause?.message ?? error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
