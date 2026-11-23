import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { DEFAULT_LEAGUE } from "@/lib/config";
import { requireAdmin } from "@/lib/auth/session";
import { logout, logoutEverywhere } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Reads the login cookie, so it can't be pre-built: everything streams inside Suspense
export default function AdminPage() {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <AdminHome />
      </Suspense>
    </main>
  );
}

async function AdminHome() {
  const admin = await requireAdmin();

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle={admin.role === "master" ? "Master Admin" : "League Admin"}
        backHref={`/leagues/${DEFAULT_LEAGUE}`}
      />
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-semibold">Hi, {admin.name}</p>
        <p className="text-sm text-muted">
          Matches waiting for a result will appear here.
        </p>
      </section>
      <div className="grid grid-cols-2 gap-2">
        <form action={logout}>
          <button className="h-12 w-full rounded-full bg-white text-sm font-semibold shadow-sm">
            Log out
          </button>
        </form>
        <form action={logoutEverywhere}>
          <button className="h-12 w-full rounded-full bg-white text-sm font-semibold text-loss shadow-sm">
            Log out all devices
          </button>
        </form>
      </div>
    </>
  );
}
