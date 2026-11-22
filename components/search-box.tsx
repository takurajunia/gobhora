"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, UserRound } from "lucide-react";
import { matchesQuery, type SearchItem } from "@/lib/search";
import { SearchInput } from "./search-input";

const MAX_RESULTS = 8;

export function SearchBox({
  items,
  placeholder,
}: {
  items: SearchItem[];
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const results =
    q.length >= 2 ? items.filter((item) => matchesQuery(q, item.terms)) : [];

  return (
    <div>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
      />
      {q.length >= 2 && (
        <ul className="mt-2 divide-y divide-line rounded-2xl bg-white px-3 shadow-sm">
          {results.slice(0, MAX_RESULTS).map((item) => {
            const Icon = item.kind === "team" ? Shield : UserRound;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10">
                    <Icon aria-hidden className="size-4 text-brand" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {item.label}
                    </span>
                    {item.sub && (
                      <span className="block truncate text-xs text-muted">
                        {item.sub}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="py-3 text-sm text-muted">
              No clubs or players match “{q}”.
            </li>
          )}
          {results.length > MAX_RESULTS && (
            <li className="py-2 text-xs text-muted">
              {results.length - MAX_RESULTS} more. Keep typing to narrow it
              down.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
