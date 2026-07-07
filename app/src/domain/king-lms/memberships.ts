/** King LMS memberships API レスポンスのパース。 */

export interface KingLmsCourseEntry {
  displayName: string | null;
  externalAccessUrl: string | null;
}

export function parseMembershipsResponse(json: unknown): KingLmsCourseEntry[] | null {
  const results = (json as Record<string, unknown>)?.results;
  if (!Array.isArray(results)) return null;
  return results.map((entry) => {
    const c = (entry as Record<string, unknown>)?.course as Record<string, unknown> | undefined;
    return {
      displayName: c?.displayName != null ? String(c.displayName) : null,
      externalAccessUrl: c?.externalAccessUrl != null ? String(c.externalAccessUrl) : null,
    };
  });
}
