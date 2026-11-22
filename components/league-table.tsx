import Link from "next/link";
import type { TableRow } from "@/lib/stats";
import { TeamBadge } from "./team-badge";

export function LeagueTable({ rows }: { rows: TableRow[] }) {
  return (
    <table className="w-full tabular-nums">
      <thead>
        <tr className="text-xs text-muted">
          <th scope="col" className="w-7 py-2 text-left font-medium">
            #
          </th>
          <th scope="col" className="py-2 text-left font-medium">
            Team
          </th>
          <th scope="col" className="w-10 py-2 text-center font-medium">
            P
          </th>
          <th scope="col" className="w-10 py-2 text-right font-medium">
            Pts
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="py-2.5 text-sm text-muted">{row.position}</td>
            <td className="py-2.5">
              <Link
                href={`/team/${row.slug}`}
                className="flex items-center gap-2.5 font-semibold"
              >
                <TeamBadge
                  name={row.name}
                  shortName={row.shortName}
                  logoUrl={row.logoUrl}
                />
                <span className="truncate">{row.name}</span>
              </Link>
            </td>
            <td className="py-2.5 text-center">{row.played}</td>
            <td className="py-2.5 text-right font-display text-lg font-bold">
              {row.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
