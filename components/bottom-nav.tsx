"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  House,
  Shield,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_LEAGUE } from "@/lib/config";

type Tab = {
  label: string;
  href: string;
  icon: LucideIcon;
  matches: (path: string) => boolean;
};

const league = `/leagues/${DEFAULT_LEAGUE}`;

const tabs: Tab[] = [
  { label: "Home", href: league, icon: House, matches: (p) => p === league },
  {
    label: "Matches",
    href: `${league}/matches`,
    icon: CalendarDays,
    matches: (p) => p.startsWith(`${league}/matches`),
  },
  {
    label: "Teams",
    href: `${league}/teams`,
    icon: Shield,
    matches: (p) =>
      p.startsWith(`${league}/teams`) ||
      p.startsWith("/team/") ||
      p.startsWith("/player/"),
  },
  {
    label: "Admin",
    href: "/admin",
    icon: UserCog,
    matches: (p) => p.startsWith("/admin"),
  },
];

// Plain version with no active tab: shown while the current page address is being worked out
export function BottomNavShell({ activeHref }: { activeHref: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon
                  aria-hidden
                  className="size-6"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const active = tabs.find((tab) => tab.matches(pathname));
  return <BottomNavShell activeHref={active?.href ?? null} />;
}
