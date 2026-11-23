import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { PlayerRankList } from "@/components/player-rank-list";
import { getLeague, getTopScorers } from "@/lib/data";
import { withRank } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Top Scorers" };

export default function ScorersPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <ScorersContent params={params} />
      </Suspense>
    </main>
  );
}

async function ScorersContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const scorers = withRank(
    await getTopScorers(league.seasonId, 300),
    (s) => s.goals,
  );

  return (
    <>
      <PageHeader
        title="Top Scorers"
        subtitle={league.leagueName}
        backHref={`/leagues/${slug}`}
      />
      {scorers.length > 0 ? (
        <PlayerRankList
          unit="Goals"
          players={scorers.map((s) => ({
            playerId: s.playerId,
            rank: s.rank,
            name: s.name,
            photoUrl: s.photoUrl,
            teamName: s.teamName,
            value: s.goals,
          }))}
        />
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          No goals scored yet.
        </p>
      )}
    </>
  );
}
