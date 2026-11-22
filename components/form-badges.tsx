import type { Outcome } from "@/lib/stats";

const COLORS: Record<Outcome, string> = {
  W: "bg-win",
  D: "bg-draw",
  L: "bg-loss",
};
const LABELS: Record<Outcome, string> = { W: "Win", D: "Draw", L: "Loss" };

// Newest result first, as in Lu6er's spec
export function FormBadges({ form }: { form: Outcome[] }) {
  return (
    <ol className="flex gap-2" aria-label="Last results, newest first">
      {form.map((outcome, i) => (
        <li
          key={i}
          title={LABELS[outcome]}
          className={`grid size-8 place-items-center rounded-full font-display text-sm font-bold text-white ${COLORS[outcome]}`}
        >
          {outcome}
        </li>
      ))}
    </ol>
  );
}
