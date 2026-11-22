import Link from "next/link";
import { PlayerAvatar } from "./player-avatar";

export type RankedPlayer = {
  playerId: number;
  rank: number;
  name: string;
  photoUrl: string | null;
  teamName: string | null;
  value: number;
};

export function PlayerRankList({
  players,
  unit,
}: {
  players: RankedPlayer[];
  unit: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 pt-2 shadow-sm">
      <p className="flex justify-between text-xs font-medium text-muted">
        <span>Player</span>
        <span>{unit}</span>
      </p>
      <ol className="divide-y divide-line">
        {players.map((p) => (
          <li key={p.playerId}>
            <Link
              href={`/player/${p.playerId}`}
              className="flex items-center gap-3 py-2.5"
            >
              <span className="w-6 text-sm text-muted tabular-nums">
                {p.rank}
              </span>
              <PlayerAvatar photoUrl={p.photoUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  {p.teamName}
                </span>
              </span>
              <span className="font-display text-2xl font-bold text-brand tabular-nums">
                {p.value}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
