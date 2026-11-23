"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/phone";
import { createSession } from "@/lib/auth/session";

export type LoginState = { error: string | null };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const WRONG = "Wrong phone number or password";
const LOCKED = `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes.`;

// Checked when the phone number is unknown, so a wrong number takes as long as a wrong password
let dummyHash: Promise<string> | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!phone)
    return { error: "Enter a Zimbabwe mobile number, like 0771 234 567" };
  if (!password) return { error: "Enter your password" };

  const [admin] = await db.select().from(admins).where(eq(admins.phone, phone));
  if (!admin) {
    dummyHash ??= hashPassword("timing-equaliser");
    await verifyPassword(password, await dummyHash);
    return { error: WRONG };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date())
    return { error: LOCKED };

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const lockNow = admin.failedLogins + 1 >= MAX_ATTEMPTS;
    await db
      .update(admins)
      .set(
        lockNow
          ? {
              failedLogins: 0,
              lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
            }
          : { failedLogins: sql`${admins.failedLogins} + 1` },
      )
      .where(eq(admins.id, admin.id));
    return { error: lockNow ? LOCKED : WRONG };
  }

  await db
    .update(admins)
    .set({ failedLogins: 0, lockedUntil: null })
    .where(eq(admins.id, admin.id));
  await createSession(admin.id);
  redirect("/admin");
}
