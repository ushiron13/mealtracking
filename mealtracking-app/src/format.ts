export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Combines the calendar day of `baseIso` with a "HH:mm" time-of-day, keeping the date fixed. */
export function withTime(baseIso: string, timeValue: string): string {
  const date = new Date(baseIso);
  const [hours, minutes] = timeValue.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
