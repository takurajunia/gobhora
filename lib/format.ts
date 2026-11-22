import type { GoalEvent } from "./stats";

const TIME_ZONE = "Africa/Harare";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDay = (date: Date) => dayFormat.format(date); // "Sat 17 Oct"
export const formatTime = (date: Date) => timeFormat.format(date); // "15:00"

// Nickname if he has one, otherwise surname
export function playerShortName(name: string, nickname?: string | null) {
  if (nickname) return nickname;
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function goalLabel(goal: GoalEvent) {
  const who = goal.name ? playerShortName(goal.name, goal.nickname) : "Unknown";
  const minute = goal.minute ? ` ${goal.minute}'` : "";
  const note = goal.isOwnGoal ? " (OG)" : goal.isPenalty ? " (pen)" : "";
  return `${who}${minute}${note}`;
}

// Standard competition ranking: equal values share a rank (1, 2, 2, 4)
export function withRank<T extends object>(
  rows: T[],
  value: (row: T) => number,
) {
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || value(row) !== value(rows[i - 1])) rank = i + 1;
    return { ...row, rank };
  });
}

// Groups matches that are already sorted, keeping their order
export function groupByMatchweek<
  T extends { matchweek: number | null; kickoffAt: Date | null },
>(rows: T[]) {
  const groups: { matchweek: number | null; date: Date | null; items: T[] }[] =
    [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.matchweek === row.matchweek) last.items.push(row);
    else
      groups.push({
        matchweek: row.matchweek,
        date: row.kickoffAt,
        items: [row],
      });
  }
  return groups;
}

export const POSITION_LABELS = {
  GK: "Goalkeeper",
  DF: "Defender",
  MF: "Midfielder",
  ST: "Striker",
} as const;

export const POSITION_GROUPS = [
  { position: "GK", label: "Goalkeepers" },
  { position: "DF", label: "Defenders" },
  { position: "MF", label: "Midfielders" },
  { position: "ST", label: "Strikers" },
] as const;

// 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st
export function ordinal(n: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
