import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { LeagueTable } from "@/components/league-table";
import {
  FixtureItem,
  MatchweekCard,
  ResultItem,
} from "@/components/match-cards";
import { PlayerCards } from "@/components/player-cards";
import {
  getLeague,
  getLeagueTable,
  getMotmLeaders,
  getRecentResults,
  getTopScorers,
  getUpcomingFixtures,
} from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

// The page itself never waits for the address, so its shell can be pre-built.
// Everything that depends on which league it is streams in inside Suspense.
export default function LeaguePage({ params }: Props) {
  return (
    <main className="space-y-6 px-4 pt-4">
      <Suspense fallback={<LeagueSkeleton />}>
        <LeagueContent params={params} />
      </Suspense>
    </main>
  );
}

async function LeagueContent({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const base = `/leagues/${slug}`;
  const [table, results, fixtures, scorers, mvps] = await Promise.all([
    getLeagueTable(league.seasonId),
    getRecentResults(league.seasonId, 6),
    getUpcomingFixtures(league.seasonId, 6),
    getTopScorers(league.seasonId, 3),
    getMotmLeaders(league.seasonId, 3),
  ]);

  // Show only the latest matchweek's results and the next matchweek's fixtures
  const latest = results
    .filter((r) => r.matchweek === results[0]?.matchweek)
    .slice(0, 3);
  const next = fixtures
    .filter((f) => f.matchweek === fixtures[0]?.matchweek)
    .slice(0, 3);

  return (
    <>
      <SiteHeader leagueName={league.leagueName} />

      <Section title="League Table" href={`${base}/table`}>
        <div className="rounded-2xl bg-white px-3 shadow-sm">
          <LeagueTable rows={table.slice(0, 4)} />
        </div>
      </Section>

      <Section title="Results" href={`${base}/matches`}>
        {latest.length > 0 ? (
          <MatchweekCard
            matchweek={latest[0].matchweek}
            date={latest[0].kickoffAt}
          >
            {latest.map((r) => (
              <ResultItem key={r.fixtureId} result={r} />
            ))}
          </MatchweekCard>
        ) : (
          <Empty>
            No results yet. They appear here as soon as a match is entered.
          </Empty>
        )}
      </Section>

      <Section title="Top Scorers" href={`${base}/scorers`}>
        {scorers.length > 0 ? (
          <PlayerCards
            cards={scorers.map((s) => ({
              playerId: s.playerId,
              name: s.name,
              photoUrl: s.photoUrl,
              teamName: s.teamName,
              value: s.goals,
              unit: s.goals === 1 ? "goal" : "goals",
            }))}
          />
        ) : (
          <Empty>No goals scored yet.</Empty>
        )}
      </Section>

      <Section title="MVPs" href={`${base}/mvps`}>
        {mvps.length > 0 ? (
          <PlayerCards
            cards={mvps.map((m) => ({
              playerId: m.playerId,
              name: m.name,
              photoUrl: m.photoUrl,
              teamName: m.teamName,
              value: m.awards,
              unit: "MOTM",
            }))}
          />
        ) : (
          <Empty>No Man of the Match awards yet.</Empty>
        )}
      </Section>

      <Section title="Fixtures" href={`${base}/fixtures`}>
        {next.length > 0 ? (
          <MatchweekCard matchweek={next[0].matchweek} date={next[0].kickoffAt}>
            {next.map((f) => (
              <FixtureItem key={f.fixtureId} fixture={f} />
            ))}
          </MatchweekCard>
        ) : (
          <Empty>No upcoming fixtures.</Empty>
        )}
      </Section>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
      {children}
    </p>
  );
}

function LeagueSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading">
      <div className="h-16 rounded-2xl bg-white" />
      <div className="h-56 rounded-2xl bg-white" />
      <div className="h-40 rounded-2xl bg-white" />
      <div className="h-40 rounded-2xl bg-white" />
    </div>
  );
}
