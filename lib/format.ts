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
