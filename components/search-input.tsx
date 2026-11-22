import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

// 16px text stops phones zooming in when the box is tapped
export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-[52px] w-full rounded-[14px] border border-line bg-white pl-12 pr-4 text-base outline-none placeholder:text-muted focus:border-brand"
      />
    </label>
  );
}
