import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = { title: string; subtitle?: string; backHref: string };

export function PageHeader({ title, subtitle, backHref }: Props) {
  return (
    <header className="flex items-center gap-3">
      <Link
        href={backHref}
        aria-label="Back"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm"
      >
        <ChevronLeft aria-hidden className="size-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs font-semibold text-muted">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
