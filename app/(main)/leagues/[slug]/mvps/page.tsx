import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { PlayerRankList } from "@/components/player-rank-list";
import { getLeague, getMotmLeaders } from "@/lib/data";
import { withRank } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "MVPs" };

export default function MvpsPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <MvpsContent params={params} />
      </Suspense>
    </main>
  );
}

async function MvpsContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const mvps = withRank(
    await getMotmLeaders(league.seasonId, 100),
    (m) => m.awards,
  );

  return (
    <>
      <PageHeader
        title="MVPs"
        subtitle={`Man of the Match awards • ${league.leagueName}`}
        backHref={`/leagues/${slug}`}
      />
      {mvps.length > 0 ? (
        <PlayerRankList
          unit="MOTM"
          players={mvps.map((m) => ({
            playerId: m.playerId,
            rank: m.rank,
            name: m.name,
            photoUrl: m.photoUrl,
            teamName: m.teamName,
            value: m.awards,
          }))}
        />
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          No awards yet.
        </p>
      )}
    </>
  );
}
