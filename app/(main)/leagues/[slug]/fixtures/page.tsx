import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { MatchesTabs } from "@/components/matches-tabs";
import { FixtureItem, MatchweekCard } from "@/components/match-cards";
import { getLeague, getUpcomingFixtures } from "@/lib/data";
import { groupByMatchweek } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Fixtures" };

export default function FixturesPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <FixturesContent params={params} />
      </Suspense>
    </main>
  );
}

async function FixturesContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const groups = groupByMatchweek(
    await getUpcomingFixtures(league.seasonId, 1000),
  );

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle={league.leagueName}
        backHref={`/leagues/${slug}`}
      />
      <MatchesTabs slug={slug} active="fixtures" />
      {groups.length > 0 ? (
        groups.map((g) => (
          <MatchweekCard
            key={`mw-${g.matchweek}`}
            matchweek={g.matchweek}
            date={g.date}
          >
            {g.items.map((f) => (
              <FixtureItem key={f.fixtureId} fixture={f} />
            ))}
          </MatchweekCard>
        ))
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          No upcoming fixtures.
        </p>
      )}
    </>
  );
}
