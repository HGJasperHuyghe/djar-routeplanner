/** Parses "HH:mm" (24h) into seconds-of-day. Returns undefined if not given/invalid. */
export function parseHHMM(value?: string): number | undefined {
  if (!value) return undefined;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return undefined;
  return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60;
}

/** Formats seconds-of-day (wrapping past 24h) back into "HH:mm". */
export function formatHHMM(totalSeconds: number): string {
  const wrapped = ((totalSeconds % 86400) + 86400) % 86400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
