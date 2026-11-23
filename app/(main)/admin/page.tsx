import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { DEFAULT_LEAGUE } from "@/lib/config";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminLeagues, pickLeague, getDueFixtureIds } from "@/lib/admin";
import { formatDay, formatTime } from "@/lib/format";
// Straight from stats, not the cached versions in data.ts: admins see live data
import {
  getRecentResults,
  getUpcomingFixtures,
  type FixtureRow,
  type ResultRow,
} from "@/lib/stats";
import { logout, logoutEverywhere } from "./actions";

type Props = { searchParams: Promise<{ league?: string }> };

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage({ searchParams }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <AdminHome searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AdminHome({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { league: requested } = await searchParams;
  const myLeagues = await getAdminLeagues(admin);
  const league = pickLeague(myLeagues, requested);

  const header = (
    <PageHeader
      title="Admin"
      subtitle={`${admin.name} • ${admin.role === "master" ? "Master Admin" : "League Admin"}`}
      backHref={`/leagues/${league?.slug ?? DEFAULT_LEAGUE}`}
    />
  );
  if (!league) {
    return (
      <>
        {header}
        <Empty>
          No league is linked to your account yet. Ask the Master Admin.
        </Empty>
        <LogoutButtons />
      </>
    );
  }

  const [scheduled, recent, dueIds] = await Promise.all([
    getUpcomingFixtures(league.seasonId, 1000),
    getRecentResults(league.seasonId, 10),
    getDueFixtureIds(league.seasonId),
  ]);
  const waiting = scheduled.filter((f) => dueIds.has(f.fixtureId));
  const comingUp = scheduled
    .filter((f) => !dueIds.has(f.fixtureId))
    .slice(0, 10);

  return (
    <>
      {header}

      {myLeagues.length > 1 && (
        <nav aria-label="League" className="flex gap-2 overflow-x-auto pb-1">
          {myLeagues.map((l) => (
            <Link
              key={l.slug}
              href={`/admin?league=${l.slug}`}
              aria-current={l.slug === league.slug ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                l.slug === league.slug
                  ? "bg-ink text-white"
                  : "bg-white text-muted shadow-sm"
              }`}
            >
              {l.name}
            </Link>
          ))}
        </nav>
      )}

      <AdminSection title={`Waiting for a result (${waiting.length})`}>
        {waiting.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl border-2 border-brand bg-white px-3">
            {waiting.map((f) => (
              <FixtureLine
                key={f.fixtureId}
                fixture={f}
                action="Enter result"
              />
            ))}
          </ul>
        ) : (
          <Empty>All caught up: no played matches are missing a result.</Empty>
        )}
      </AdminSection>

      <AdminSection title="Coming up">
        {comingUp.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
            {comingUp.map((f) => (
              <FixtureLine key={f.fixtureId} fixture={f} />
            ))}
          </ul>
        ) : (
          <Empty>No fixtures scheduled. Add the next matchweek below.</Empty>
        )}
        <Link
          href={`/admin/fixtures/new?league=${league.slug}`}
          className="flex h-12 items-center justify-center gap-1 rounded-full bg-brand font-bold text-white"
        >
          <Plus aria-hidden className="size-5" /> Add fixture
        </Link>
      </AdminSection>

      {recent.length > 0 && (
        <AdminSection title="Recent results">
          <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
            {recent.map((r) => (
              <ResultLine key={r.fixtureId} result={r} />
            ))}
          </ul>
        </AdminSection>
      )}

      <LogoutButtons />
    </>
  );
}

function when(date: Date | null) {
  return date ? `${formatDay(date)} • ${formatTime(date)}` : "Date TBC";
}

function FixtureLine({
  fixture: f,
  action,
}: {
  fixture: FixtureRow;
  action?: string;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">
          {when(f.kickoffAt)}
          {f.matchweek ? ` • MW${f.matchweek}` : ""}
        </p>
        <p className="truncate text-sm font-semibold">
          {f.home.name} <span className="font-normal text-muted">vs</span>{" "}
          {f.away.name}
        </p>
      </div>
      {action && (
        <Link
          href={`/admin/fixtures/${f.fixtureId}/result`}
          className="shrink-0 rounded-full bg-brand px-3 py-2 text-xs font-bold text-white"
        >
          {action}
        </Link>
      )}
    </li>
  );
}

function ResultLine({ result: r }: { result: ResultRow }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">
          {when(r.kickoffAt)}
          {r.matchweek ? ` • MW${r.matchweek}` : ""}
        </p>
        <p className="truncate text-sm font-semibold">
          {r.home.name}{" "}
          <span className="font-display text-base tabular-nums">
            {r.homeScore}–{r.awayScore}
          </span>{" "}
          {r.away.name}
        </p>
      </div>
      <Link
        href={`/admin/fixtures/${r.fixtureId}/result`}
        className="shrink-0 rounded-full bg-surface px-3 py-2 text-xs font-bold"
      >
        Edit
      </Link>
    </li>
  );
}

function AdminSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
      {children}
    </p>
  );
}

function LogoutButtons() {
  return (
    <div className="grid grid-cols-2 gap-2 pt-2">
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
  );
}
