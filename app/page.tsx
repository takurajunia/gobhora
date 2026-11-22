import Link from "next/link";
import { Logo } from "@/components/logo";
import { LeagueDirectory } from "@/components/league-directory";
import { DEFAULT_LEAGUE } from "@/lib/config";
import { getLeagueDirectory, getTeamsForSearch } from "@/lib/data";

// Everything here is cached, so the page is pre-built and served instantly
export default async function WelcomePage() {
  const [leagues, teams] = await Promise.all([
    getLeagueDirectory(),
    getTeamsForSearch(),
  ]);

  return (
    <div className="min-h-dvh bg-ink">
      <header className="mx-auto max-w-md px-6 pb-12 pt-10 text-center text-white">
        <div className="flex justify-center">
          <Logo inverted />
        </div>
        <h1 className="mt-8 font-display text-4xl font-bold">
          Welcome to GoBhora
        </h1>
        <p className="mt-1 text-sm text-white/80">
          Home of Zimbabwe football leagues
        </p>
      </header>

      <main className="mx-auto -mt-6 min-h-[70dvh] max-w-md rounded-t-[32px] bg-surface px-4 pb-10 pt-6">
        <p className="text-center font-display text-lg font-bold">
          Enjoy <Dot /> Record <Dot /> Connect
        </p>

        <LeagueDirectory leagues={leagues} teams={teams} />

        <Link
          href={`/leagues/${DEFAULT_LEAGUE}`}
          className="mx-auto mt-6 flex h-14 w-[90%] items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
        >
          Get Started
        </Link>
        <p className="mt-4 text-center text-[10px] text-muted">
          By continuing you agree to our Terms &amp; Privacy
        </p>
      </main>
    </div>
  );
}

function Dot() {
  return <span className="text-brand">•</span>;
}
