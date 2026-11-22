import Link from "next/link";

type Props = { slug: string; active: "results" | "fixtures" };

export function MatchesTabs({ slug, active }: Props) {
  const tabs = [
    { key: "results", label: "Results", href: `/leagues/${slug}/matches` },
    { key: "fixtures", label: "Fixtures", href: `/leagues/${slug}/fixtures` },
  ] as const;

  return (
    <nav
      aria-label="Matches"
      className="grid grid-cols-2 rounded-full bg-white p-1 shadow-sm"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`rounded-full py-2 text-center text-sm font-semibold ${
            tab.key === active ? "bg-ink text-white" : "text-muted"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
