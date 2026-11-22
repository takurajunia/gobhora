import Link from "next/link";
import type { FixtureRow, MatchTeam, ResultRow } from "@/lib/stats";
import { formatDay, formatTime, goalLabel } from "@/lib/format";
import { TeamBadge } from "./team-badge";

function TeamName({
  team,
  align = "left",
}: {
  team: MatchTeam;
  align?: "left" | "right";
}) {
  return (
    <Link
      href={`/team/${team.slug}`}
      className={`flex min-w-0 items-center gap-2 font-semibold ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamBadge
        name={team.name}
        shortName={team.shortName}
        logoUrl={team.logoUrl}
      />
      <span className="truncate text-sm">{team.name}</span>
    </Link>
  );
}

export function MatchweekCard({
  matchweek,
  date,
  children,
}: {
  matchweek: number | null;
  date: Date | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 pt-2 shadow-sm">
      <p className="flex justify-between text-xs font-semibold text-muted">
        <span>{matchweek ? `Matchweek ${matchweek}` : "Matches"}</span>
        {date && <span>{formatDay(date)}</span>}
      </p>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}

export function ResultItem({ result }: { result: ResultRow }) {
  const scorers = (teamId: number) =>
    result.goals
      .filter((g) => g.teamId === teamId)
      .map(goalLabel)
      .join(", ");

  return (
    <li className="py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamName team={result.home} />
        <span className="rounded-lg bg-ink px-2.5 py-1 font-display text-lg font-bold leading-none text-white tabular-nums">
          {result.homeScore}–{result.awayScore}
        </span>
        <TeamName team={result.away} align="right" />
      </div>
      {result.goals.length > 0 && (
        <div className="mt-1.5 grid grid-cols-2 gap-3 text-xs text-muted">
          <p>{scorers(result.home.id)}</p>
          <p className="text-right">{scorers(result.away.id)}</p>
        </div>
      )}
    </li>
  );
}

export function FixtureItem({ fixture }: { fixture: FixtureRow }) {
  return (
    <li className="py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamName team={fixture.home} />
        <span className="rounded-lg bg-surface px-2.5 py-1 font-display text-lg font-bold leading-none tabular-nums">
          {fixture.kickoffAt ? formatTime(fixture.kickoffAt) : "TBC"}
        </span>
        <TeamName team={fixture.away} align="right" />
      </div>
      {fixture.venueName && (
        <p className="mt-1 text-center text-xs text-muted">
          {fixture.venueName}
        </p>
      )}
    </li>
  );
}
