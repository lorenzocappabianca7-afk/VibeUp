/** Sky blue used only for the demo “how fast you booked” number. */
export const DEMO_SPEED_AZZURRO = "#5EC8FF";

export interface DemoDurationParts {
  hours: number;
  minutes: number;
  seconds: number;
  /** Compact label, e.g. "3 min 12 sec". */
  label: string;
}

export function demoBookingDurationMs(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): number | null {
  if (!startedAt || !endedAt) return null;
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return end - start;
}

export function formatDemoDuration(ms: number): DemoDurationParts {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let label: string;
  if (hours > 0) {
    label =
      minutes > 0
        ? `${hours} h ${minutes} min`
        : `${hours} ${hours === 1 ? "ora" : "ore"}`;
  } else if (minutes > 0) {
    label = seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`;
  } else {
    label = `${seconds} ${seconds === 1 ? "secondo" : "secondi"}`;
  }

  return { hours, minutes, seconds, label };
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}
