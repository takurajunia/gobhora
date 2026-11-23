import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_LEAGUE } from "@/lib/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="space-y-4 px-4 pt-4">
      <PageHeader
        title="Admin"
        subtitle="For league admins only"
        backHref={`/leagues/${DEFAULT_LEAGUE}`}
      />
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <LoginForm />
      </section>
      <p className="text-center text-xs text-muted">
        Forgot your password? Ask the Master Admin to reset it.
      </p>
    </main>
  );
}
