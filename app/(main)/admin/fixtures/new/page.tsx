import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { requireAdmin } from "@/lib/auth/session";
import {
  getAdminLeagues,
  getLeagueTeams,
  getVenues,
  pickLeague,
} from "@/lib/admin";
import { FixtureForm } from "./fixture-form";

type Props = { searchParams: Promise<{ league?: string }> };

export const metadata: Metadata = {
  title: "Add fixture",
  robots: { index: false, follow: false },
};

export default function NewFixturePage({ searchParams }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <NewFixtureContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewFixtureContent({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { league: requested } = await searchParams;
  const league = pickLeague(await getAdminLeagues(admin), requested);
  if (!league) notFound();

  const [teamList, venueList] = await Promise.all([
    getLeagueTeams(league.leagueId),
    getVenues(),
  ]);

  return (
    <>
      <PageHeader
        title="Add fixture"
        subtitle={league.name}
        backHref={`/admin?league=${league.slug}`}
      />
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <FixtureForm
          leagueSlug={league.slug}
          teams={teamList}
          venues={venueList}
        />
      </section>
    </>
  );
}
