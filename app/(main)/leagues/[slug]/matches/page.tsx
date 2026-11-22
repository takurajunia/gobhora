import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { MatchesTabs } from "@/components/matches-tabs";
import { MatchweekCard, ResultItem } from "@/components/match-cards";
import { getLeague, getRecentResults } from "@/lib/data";
import { groupByMatchweek } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Results" };

export default function ResultsPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <ResultsContent params={params} />
      </Suspense>
    </main>
  );
}

async function ResultsContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const groups = groupByMatchweek(
    await getRecentResults(league.seasonId, 1000),
  );

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle={league.leagueName}
        backHref={`/leagues/${slug}`}
      />
      <MatchesTabs slug={slug} active="results" />
      {groups.length > 0 ? (
        groups.map((g) => (
          <MatchweekCard
            key={`mw-${g.matchweek}`}
            matchweek={g.matchweek}
            date={g.date}
          >
            {g.items.map((r) => (
              <ResultItem key={r.fixtureId} result={r} />
            ))}
          </MatchweekCard>
        ))
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          No results yet.
        </p>
      )}
    </>
  );
}
