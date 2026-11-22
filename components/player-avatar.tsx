import Image from "next/image";
import { UserRound } from "lucide-react";

export function PlayerAvatar({
  photoUrl,
  size = 56,
}: {
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
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
      className="flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#cfd8dc]"
      style={{ width: size, height: size }}
    >
      <UserRound
        className="fill-white text-white"
        strokeWidth={0}
        style={{
          width: size * 0.8,
          height: size * 0.8,
          marginBottom: -size * 0.08,
        }}
      />
    </span>
  );
}
