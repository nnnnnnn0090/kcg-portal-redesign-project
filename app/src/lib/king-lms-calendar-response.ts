/**
 * King LMS `/learn/api/v1/calendars/calendarItems` のレスポンス正規化。
 */

export function normalizeCalendarItemsResponse(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return null;
  const results = (json as Record<string, unknown>).results;
  if (!Array.isArray(results)) return null;
  return results;
}

export function isCalendarItemsLoaded(json: unknown): boolean {
  return normalizeCalendarItemsResponse(json) !== null;
}
