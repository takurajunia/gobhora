"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Shield, Trophy } from "lucide-react";
import { matchesQuery } from "@/lib/search";
import type { LeagueCard, TeamSearchRow } from "@/lib/stats";
import { SearchInput } from "./search-input";

type Props = { leagues: LeagueCard[]; teams: TeamSearchRow[] };

export function LeagueDirectory({ leagues, teams }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const shownLeagues = q
    ? leagues.filter((l) => matchesQuery(q, l.name, l.region, l.tier))
    : leagues;
  const shownTeams =
    q.length >= 2
      ? teams
          .filter((t) => matchesQuery(q, t.name, t.shortName, t.area))
          .slice(0, 6)
      : [];

  return (
    <>
      <div className="mt-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search for league or team"
        />
      </div>

      {shownTeams.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
          {shownTeams.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/team/${t.slug}`}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10">
                  <Shield aria-hidden className="size-4 text-brand" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {t.leagueName}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {shownLeagues.map((l) => (
          <li key={l.id}>
            <Link
              href={`/leagues/${l.slug}`}
              className="flex h-full flex-col rounded-[20px] bg-white p-4 shadow-sm"
            >
              {l.logoUrl ? (
                <Image
                  src={l.logoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-xl object-cover"
                />
              ) : (
                <span className="grid size-12 place-items-center rounded-xl bg-ink">
                  <Trophy aria-hidden className="size-6 text-white" />
                </span>
              )}
              <span className="mt-3 text-sm font-bold leading-tight">
                {l.name}
              </span>
              <span className="text-[11px] text-muted">
                {[l.region, l.tier].filter(Boolean).join(" • ")}
              </span>
              <span className="mt-auto flex items-center justify-between gap-1 pt-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <MapPin aria-hidden className="size-3" /> {l.teamCount} Teams
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    l.isActive ? "bg-brand text-white" : "bg-line text-muted"
                  }`}
                >
                  {l.isActive ? "Active" : "Off-season"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {q && shownLeagues.length === 0 && shownTeams.length === 0 && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-muted shadow-sm">
          No leagues or teams match “{q}”.
        </p>
      )}
    </>
  );
}
