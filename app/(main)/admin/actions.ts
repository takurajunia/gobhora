"use server";

import { redirect } from "next/navigation";
import {
  destroyAllSessions,
  destroySession,
  requireAdmin,
} from "@/lib/auth/session";

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function logoutEverywhere() {
  const admin = await requireAdmin();
  await destroyAllSessions(admin.id);
  redirect("/admin/login");
}
