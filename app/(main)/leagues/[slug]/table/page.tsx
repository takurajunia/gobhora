import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { FullLeagueTable } from "@/components/full-league-table";
import { getLeague, getLeagueTable } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "League Table" };

export default function TablePage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <TableContent params={params} />
      </Suspense>
    </main>
  );
}

async function TableContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const table = await getLeagueTable(league.seasonId);

  return (
    <>
      <PageHeader
        title="League Table"
        subtitle={`${league.leagueName} ${league.seasonName}`}
        backHref={`/leagues/${slug}`}
      />
      {table.some((row) => row.played > 0) ? (
        <div className="rounded-2xl bg-white px-3 shadow-sm">
          <FullLeagueTable rows={table} />
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          Standings coming soon.
        </p>
      )}
    </>
  );
}
