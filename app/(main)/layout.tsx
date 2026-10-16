import { Suspense } from "react";
import { BottomNav, BottomNavShell } from "@/components/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-md pb-24">{children}</div>
      <Suspense fallback={<BottomNavShell activeHref={null} />}>
        <BottomNav />
      </Suspense>
    </>
  );
}
