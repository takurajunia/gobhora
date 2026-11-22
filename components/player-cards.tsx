import Link from "next/link";
import { PlayerAvatar } from "./player-avatar";

export type PlayerCard = {
  playerId: number;
  name: string;
  photoUrl: string | null;
  teamName: string | null;
  value: number;
  unit: string;
};

export function PlayerCards({ cards }: { cards: PlayerCard[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <li key={card.playerId}>
          <Link
            href={`/player/${card.playerId}`}
            className="flex h-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm"
          >
            <PlayerAvatar photoUrl={card.photoUrl} size={52} />
            <span className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
              {card.name}
            </span>
            <span className="line-clamp-1 text-xs text-muted">
              {card.teamName}
            </span>
            <span className="mt-auto pt-1 font-display text-2xl font-bold text-brand">
              {card.value}{" "}
              <span className="font-sans text-xs font-semibold text-muted">
                {card.unit}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
