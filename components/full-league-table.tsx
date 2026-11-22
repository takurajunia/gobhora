import Link from "next/link";
import type { TableRow } from "@/lib/stats";
import { TeamBadge } from "./team-badge";

// From the PDF spec. TODO: confirm with Lu6er how many teams go up / down, if any
const TOP_ZONE = 3;
const BOTTOM_ZONE = 2;

const formatGd = (gd: number) => (gd > 0 ? `+${gd}` : String(gd));

export function FullLeagueTable({ rows }: { rows: TableRow[] }) {
  return (
    <>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="w-8 py-2 text-left font-medium">
              #
            </th>
            <th scope="col" className="py-2 text-left font-medium">
              Team
            </th>
            {["P", "W", "D", "L", "GD"].map((h) => (
              <th
                key={h}
                scope="col"
                className="w-7 py-2 text-center font-medium"
              >
                {h}
              </th>
            ))}
            <th scope="col" className="w-9 py-2 text-right font-medium">
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const zone =
              row.position <= TOP_ZONE
                ? "border-win"
                : row.position > rows.length - BOTTOM_ZONE
                  ? "border-loss"
                  : "border-transparent";
            return (
              <tr key={row.id}>
                <td className="py-2.5">
                  <span className={`border-l-[3px] pl-1.5 text-muted ${zone}`}>
                    {row.position}
                  </span>
                </td>
                <td className="max-w-0 py-2.5">
                  <Link
                    href={`/team/${row.slug}`}
                    className="flex items-center gap-2 font-semibold"
                  >
                    <TeamBadge
                      name={row.name}
                      shortName={row.shortName}
                      logoUrl={row.logoUrl}
                      size={24}
                    />
                    <span className="truncate">{row.name}</span>
                  </Link>
                </td>
                <td className="py-2.5 text-center">{row.played}</td>
                <td className="py-2.5 text-center">{row.won}</td>
                <td className="py-2.5 text-center">{row.drawn}</td>
                <td className="py-2.5 text-center">{row.lost}</td>
                <td className="py-2.5 text-center">
                  {formatGd(row.goalDifference)}
                </td>
                <td className="py-2.5 text-right font-display text-lg font-bold">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex gap-4 border-t border-line py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-[3px] bg-win" /> Top {TOP_ZONE}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-[3px] bg-loss" /> Relegation zone
        </span>
      </p>
    </>
  );
}
