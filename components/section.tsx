import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = { title: string; href?: string; children: React.ReactNode };

export function Section({ title, href, children }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {href && (
          <Link
            href={href}
            className="flex items-center text-sm font-semibold text-brand"
          >
            See all
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
