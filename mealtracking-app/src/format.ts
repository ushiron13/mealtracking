/** Local calendar date as "YYYY-MM-DD" (avoids UTC day-boundary drift from toISOString). */
export function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
