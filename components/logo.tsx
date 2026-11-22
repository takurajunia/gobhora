import { Shield } from "lucide-react";

export function Logo() {
  return (
    <span className="flex items-center gap-1.5 font-display text-2xl font-bold">
      <Shield aria-hidden className="size-6 fill-brand text-brand" />
      <span>
        <span className="text-brand">Go</span>Bhora
      </span>
    </span>
  );
}
