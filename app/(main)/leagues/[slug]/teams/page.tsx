import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { TeamBadge } from "@/components/team-badge";
import { getLeague, getLeagueTable } from "@/lib/data";
import { ordinal } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <TeamsContent params={params} />
      </Suspense>
    </main>
  );
}

async function TeamsContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const table = await getLeagueTable(league.seasonId);
  const teams = [...table].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle={league.leagueName}
        backHref={`/leagues/${slug}`}
      />
      <ul className="grid grid-cols-2 gap-2">
        {teams.map((t) => (
          <li key={t.id}>
            <Link
              href={`/team/${t.slug}`}
              className="flex h-full flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm"
            >
              <TeamBadge
                name={t.name}
                shortName={t.shortName}
                logoUrl={t.logoUrl}
                size={56}
              />
              <span className="mt-2 font-semibold leading-tight">{t.name}</span>
              <span className="mt-auto pt-1 text-xs text-muted">
                {ordinal(t.position)} • {t.points} pts
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
