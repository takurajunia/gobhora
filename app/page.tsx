import Link from "next/link";
import { Logo } from "@/components/logo";
import { DEFAULT_LEAGUE } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4">
      <Logo />
      <Link
        href={`/leagues/${DEFAULT_LEAGUE}`}
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white"
      >
        Open SAZSL
      </Link>
    </main>
  );
}
