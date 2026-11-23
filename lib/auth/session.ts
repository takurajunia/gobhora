import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, sessions } from "@/db/schema";
import { SESSION_COOKIE } from "./constants";

const SESSION_DAYS = 30;

// The database only ever sees this fingerprint, so a leaked database can't be used to log in
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())); // tidy up expired logins
  await db
    .insert(sessions)
    .values({ id: hashToken(token), adminId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // page scripts can't read it
    secure: process.env.NODE_ENV === "production", // https only once deployed
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export type CurrentAdmin = {
  id: number;
  name: string;
  role: "master" | "league";
  leagueId: number | null;
};

// cache() means one database check per request, however many components ask
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: admins.id,
      name: admins.name,
      role: admins.role,
      leagueId: admins.leagueId,
    })
    .from(sessions)
    .innerJoin(admins, eq(admins.id, sessions.adminId))
    .where(
      and(
        eq(sessions.id, hashToken(token)),
        gt(sessions.expiresAt, sql`now()`),
      ),
    );
  return row ?? null;
});

// Use at the top of every admin page and every admin server action
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(adminId: number) {
  await db.delete(sessions).where(eq(sessions.adminId, adminId));
  (await cookies()).delete(SESSION_COOKIE);
}
