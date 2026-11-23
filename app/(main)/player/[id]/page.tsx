import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hand } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamBadge } from "@/components/team-badge";
import { DEFAULT_LEAGUE } from "@/lib/config";
import {
  getLeague,
  getPlayer,
  getPlayerRecentMatches,
  getPlayerSeasonStats,
} from "@/lib/data";
import { formatDay, positionLabel } from "@/lib/format";
import type { Carryover, PlayerMatch } from "@/lib/stats";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Player Profile" };

export default function PlayerPage({ params }: Props) {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Suspense fallback={<PageSkeleton />}>
        <PlayerContent params={params} />
      </Suspense>
    </main>
  );
}

async function PlayerContent({ params }: Props) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  // Only real database ids get as far as a query
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) notFound();

  const player = await getPlayer(id);
  if (!player) notFound();
  const league = await getLeague(player.leagueSlug ?? DEFAULT_LEAGUE);
  if (!league) notFound();

  const [stats, recent] = await Promise.all([
    getPlayerSeasonStats(id, league.seasonId),
    getPlayerRecentMatches(id, league.seasonId, 5),
  ]);

  const isKeeper = player.position === "GK";
  const backHref = player.teamSlug
    ? `/team/${player.teamSlug}`
    : `/leagues/${DEFAULT_LEAGUE}`;

  return (
    <>
      <PageHeader
        title="Player Profile"
        subtitle={league.leagueName}
        backHref={backHref}
      />

      <section className="flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-sm">
        <span className="rounded-full p-1 ring-[3px] ring-brand">
          <PlayerAvatar photoUrl={player.photoUrl} size={112} />
        </span>
        <h2 className="mt-3 font-display text-3xl font-bold leading-none">
          {player.name}
        </h2>
        {player.nickname && (
          <p className="text-sm text-muted">“{player.nickname}”</p>
        )}
        <p
          className={`mt-1 flex items-center gap-1 text-sm font-semibold ${
            isKeeper ? "text-brand" : "text-muted"
          }`}
        >
          {isKeeper && <Hand aria-hidden className="size-4" />}
          {player.jerseyNumber ? `#${player.jerseyNumber} • ` : ""}
          {positionLabel(player.position)}
          {player.isCaptain ? " • Captain" : ""}
        </p>
        {player.teamSlug && player.teamName && (
          <Link
            href={`/team/${player.teamSlug}`}
            className="mt-2 flex items-center gap-2 text-sm font-semibold"
          >
            <TeamBadge
              name={player.teamName}
              shortName={player.teamShortName}
              logoUrl={player.teamLogoUrl}
              size={22}
            />
            {player.teamName}
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Stat label="Matches Played" value={stats.appearances} />
        {isKeeper ? (
          <Stat label="Clean Sheets" value={stats.cleanSheets} />
        ) : (
          <Stat label="Goals" value={stats.goals} />
        )}
        <Stat label="Yellow Cards" value={stats.yellowCards} />
        <Stat label="Red Cards" value={stats.redCards} />
      </section>

      <p className="text-center text-xs text-muted">
        MOTM {stats.motm} • Penalties {stats.penalties} • Own goals{" "}
        {stats.ownGoals}
      </p>

      {stats.carryover && <CarryoverNote carryover={stats.carryover} />}

      {stats.goalsByTeam.length > 1 && (
        <p className="rounded-2xl bg-white p-3 text-sm shadow-sm">
          <span className="font-semibold">Season: {stats.goals} goals</span>{" "}
          <span className="text-muted">
            (
            {stats.goalsByTeam
              .map((t) => `${t.goals} for ${t.teamName}`)
              .join(", ")}
            )
          </span>
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Last 5 Matches</h2>
        {recent.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
            {recent.map((m) => (
              <MatchRow key={m.fixtureId} match={m} isKeeper={isKeeper} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
            No matches entered in GoBhora yet.
          </p>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="font-display text-4xl font-bold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function MatchRow({
  match,
  isKeeper,
}: {
  match: PlayerMatch;
  isKeeper: boolean;
}) {
  const { goalsFor: gf, goalsAgainst: ga } = match;
  const resultColor = gf > ga ? "bg-win" : gf === ga ? "bg-draw" : "bg-loss";
  const scored = match.goals.filter((g) => !g.isOwnGoal);
  const ownGoals = match.goals.filter((g) => g.isOwnGoal);
  const minutes = (goals: PlayerMatch["goals"]) =>
    goals
      .map(
        (g) => (g.minute ? `${g.minute}'` : "") + (g.isPenalty ? " (pen)" : ""),
      )
      .filter(Boolean)
      .join(", ");

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-xs text-muted">
          {match.kickoffAt ? formatDay(match.kickoffAt) : ""}
        </span>
        <Link
          href={`/team/${match.opponent.slug}`}
          className="min-w-0 flex-1 truncate text-sm font-semibold"
        >
          vs {match.opponent.name}{" "}
          <span className="font-normal text-muted">
            ({match.isHome ? "H" : "A"})
          </span>
        </Link>
        <span
          className={`rounded-md px-2 py-0.5 font-display text-base font-bold text-white tabular-nums ${resultColor}`}
        >
          {gf}–{ga}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-[4.25rem] text-xs text-muted">
        {scored.length > 0 && (
          <span>
            {"⚽".repeat(scored.length)} {minutes(scored)}
          </span>
        )}
        {ownGoals.length > 0 && <span>OG {minutes(ownGoals)}</span>}
        {isKeeper && ga === 0 && (
          <span className="rounded-full bg-win/15 px-2 py-0.5 font-semibold text-win">
            Clean sheet
          </span>
        )}
        {match.cards.map((card, i) => (
          <span
            key={i}
            aria-label={`${card} card`}
            className={`inline-block h-3.5 w-2.5 rounded-[2px] ${card === "red" ? "bg-loss" : "bg-yellow-400"}`}
          />
        ))}
        {match.isMotm && (
          <span className="rounded-full bg-brand/15 px-2 py-0.5 font-semibold text-brand">
            MOTM
          </span>
        )}
      </div>
    </li>
  );
}

function CarryoverNote({ carryover: c }: { carryover: Carryover }) {
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts = [
    c.goals ? plural(c.goals, "goal") : null,
    c.ownGoals ? plural(c.ownGoals, "own goal") : null,
    c.redCards ? plural(c.redCards, "red card") : null,
  ].filter(Boolean);

  return (
    <p className="rounded-2xl bg-brand/10 p-3 text-xs leading-relaxed">
      {parts.length > 0 && (
        <>
          Includes {parts.join(", ")} recorded before GoBhora ({c.source}).{" "}
        </>
      )}
      {!c.yellowCardsTracked && "Yellow cards weren't tracked then. "}
      Matches played only counts games entered in GoBhora.
    </p>
  );
}
