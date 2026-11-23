import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { TeamBadge } from "@/components/team-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { FormBadges } from "@/components/form-badges";
import { FixtureItem } from "@/components/match-cards";
import {
  getLeague,
  getLeagueTable,
  getRecentResults,
  getSquad,
  getTeam,
  getUpcomingFixtures,
} from "@/lib/data";
import {
  formatDay,
  formatTime,
  goalLabel,
  ordinal,
  POSITION_GROUPS,
  positionLabel,
} from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Club Profile" };

export default function TeamPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <TeamContent params={params} />
      </Suspense>
    </main>
  );
}

async function TeamContent({ params }: Props) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();
  const league = await getLeague(team.leagueSlug);
  if (!league) notFound();

  const [table, results, fixtures, squad] = await Promise.all([
    getLeagueTable(league.seasonId),
    getRecentResults(league.seasonId, 1, team.id),
    getUpcomingFixtures(league.seasonId, 5, team.id),
    getSquad(team.id, league.seasonId),
  ]);

  const standing = table.find((row) => row.id === team.id);
  const captain = squad.find((p) => p.isCaptain);
  const [next, ...later] = fixtures;
  const last = results[0];

  return (
    <>
      <PageHeader
        title="Club Profile"
        subtitle={league.leagueName}
        backHref={`/leagues/${team.leagueSlug}/teams`}
      />

      <section className="flex items-center justify-between gap-3 rounded-2xl bg-brand/10 p-4">
        <div className="min-w-0">
          <TeamBadge
            name={team.name}
            shortName={team.shortName}
            logoUrl={team.logoUrl}
            size={56}
          />
          <h2 className="mt-2 font-display text-3xl font-bold leading-none">
            {team.name}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {[
              team.area,
              team.foundedYear ? `Founded ${team.foundedYear}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
          {standing && standing.played > 0 && (
            <p className="mt-1 text-xs font-semibold text-brand">
              {ordinal(standing.position)} in {league.leagueName}
            </p>
          )}
          {team.venueName && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <MapPin aria-hidden className="size-3.5" /> {team.venueName}
            </p>
          )}
        </div>
        {team.managerName && (
          <div className="flex shrink-0 flex-col items-center text-center">
            <PlayerAvatar photoUrl={team.managerPhotoUrl} size={64} />
            <p className="mt-1 text-[11px] text-muted">Manager</p>
            <p className="max-w-24 text-xs font-bold leading-tight">
              {team.managerName}
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-4 gap-2">
        <Stat label="Played" value={standing?.played ?? 0} />
        <Stat label="Wins" value={standing?.won ?? 0} />
        <Stat label="Points" value={standing?.points ?? 0} />
        <Stat label="Goals" value={standing?.goalsFor ?? 0} />
      </section>

      {standing && standing.form.length > 0 && (
        <section className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-sm font-semibold">
            Form{" "}
            <span className="text-muted">• Last {standing.form.length}</span>
          </p>
          <FormBadges form={standing.form} />
        </section>
      )}

      {next && (
        <section className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-xs text-muted">
            Next Match • Matchweek {next.matchweek}
          </p>
          <p className="mt-0.5 font-semibold">
            vs{" "}
            <Link
              href={`/team/${(next.home.id === team.id ? next.away : next.home).slug}`}
            >
              {(next.home.id === team.id ? next.away : next.home).name}
            </Link>{" "}
            <span className="text-muted">
              ({next.home.id === team.id ? "H" : "A"})
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays aria-hidden className="size-3.5" />
              {next.kickoffAt
                ? `${formatDay(next.kickoffAt)} ${formatTime(next.kickoffAt)}`
                : "TBC"}
            </span>
            {next.venueName && (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden className="size-3.5" /> {next.venueName}
              </span>
            )}
          </p>
        </section>
      )}

      {last && <LastResult teamId={team.id} result={last} />}

      {captain && (
        <section className="space-y-2">
          <h2 className="font-display text-2xl font-bold">Team Captain</h2>
          <Link
            href={`/player/${captain.id}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
          >
            <PlayerAvatar photoUrl={captain.photoUrl} size={64} />
            <div>
              <p className="font-semibold">{captain.name}</p>
              <p className="text-xs text-muted">
                {positionLabel(captain.position)}
                {captain.jerseyNumber
                  ? ` • Number ${captain.jerseyNumber}`
                  : ""}
              </p>
              <span className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                C • CAPTAIN
              </span>
            </div>
          </Link>
        </section>
      )}

      {later.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-2xl font-bold">Upcoming</h2>
          <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
            {later.map((f) => (
              <FixtureItem key={f.fixtureId} fixture={f} showDate />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">
          Squad <span className="text-base text-muted">({squad.length})</span>
        </h2>
        {POSITION_GROUPS.map(({ position, label }) => {
          const players = squad.filter((p) => p.position === position);
          if (players.length === 0) return null;
          return (
            <div
              key={label}
              className="rounded-2xl bg-white px-3 pt-2 shadow-sm"
            >
              <p className="flex text-xs font-medium text-muted">
                <span className="flex-1">{label}</span>
                <span className="w-10 text-center">Apps</span>
                <span className="w-10 text-right">Goals</span>
              </p>
              <ul className="divide-y divide-line">
                {players.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/player/${p.id}`}
                      className="flex items-center gap-3 py-2"
                    >
                      <span className="w-6 font-display text-lg font-bold text-muted tabular-nums">
                        {p.jerseyNumber ?? "–"}
                      </span>
                      <PlayerAvatar photoUrl={p.photoUrl} size={36} />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {p.name}
                        {p.isCaptain && (
                          <span className="ml-1.5 rounded bg-brand px-1 text-[10px] font-bold text-white">
                            C
                          </span>
                        )}
                      </span>
                      <span className="w-10 text-center text-sm tabular-nums">
                        {p.appearances}
                      </span>
                      <span className="w-10 text-right font-display text-lg font-bold tabular-nums">
                        {p.goals}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="font-display text-3xl font-bold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

type LastResultProps = {
  teamId: number;
  result: Awaited<ReturnType<typeof getRecentResults>>[number];
};

function LastResult({ teamId, result }: LastResultProps) {
  const isHome = result.home.id === teamId;
  const opponent = isHome ? result.away : result.home;
  const [gf, ga] = isHome
    ? [result.homeScore, result.awayScore]
    : [result.awayScore, result.homeScore];
  const outcome = gf > ga ? "WON" : gf === ga ? "DREW" : "LOST";
  const color = gf > ga ? "text-win" : gf === ga ? "text-muted" : "text-loss";
  const scorers = result.goals
    .filter((g) => g.teamId === teamId)
    .map(goalLabel)
    .join(" • ");

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm">
      <p className={`text-sm font-bold ${color}`}>
        Last Result • {outcome} {gf}–{ga} vs {opponent.name}
        {result.kickoffAt ? ` • ${formatDay(result.kickoffAt)}` : ""}
      </p>
      {scorers && (
        <p className="mt-0.5 text-xs text-muted">Scorers: {scorers}</p>
      )}
    </section>
  );
}
