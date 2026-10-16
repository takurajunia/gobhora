import { Trophy } from "lucide-react";
import { Logo } from "./logo";

export function SiteHeader({ leagueName }: { leagueName: string }) {
  return (
    <header className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
      <Logo />
      <div className="flex items-center gap-2">
        <span className="max-w-36 text-right text-[11px] font-semibold leading-tight">
          {leagueName}
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-ink">
          <Trophy aria-hidden className="size-4 text-white" />
        </span>
      </div>
    </header>
  );
}
