import Image from "next/image";

type Props = {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  size?: number;
};

export function TeamBadge({ name, shortName, logoUrl, size = 28 }: Props) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-brand/10 font-display font-bold text-brand"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {(shortName ?? name).slice(0, 3).toUpperCase()}
    </span>
  );
}
