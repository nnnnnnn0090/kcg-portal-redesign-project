/**
 * King LMS `/learn/api/v1/streams/ultra` のレスポンス判定。
 * 未ロードのプレースホルダーと、読み込み済みの本体を区別する。
 */

export function isStreamsUltraLoadingPlaceholder(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const body = json as Record<string, unknown>;
  const entries = body.sv_streamEntries;
  if (!Array.isArray(entries) || entries.length > 0) return false;

  // 実測: 初回プレースホルダーは sv_moreData=true、sx_courses=[]、sv_providers が 1 件のみ
  if (body.sv_moreData === true) return true;

  const providers = body.sv_providers;
  const extras = body.sv_extras as Record<string, unknown> | undefined;
  const courses = extras?.sx_courses;
  return Array.isArray(providers)
    && providers.length <= 1
    && Array.isArray(courses)
    && courses.length === 0;
}

export function isStreamsUltraLoaded(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const body = json as Record<string, unknown>;
  const entries = body.sv_streamEntries;
  if (!Array.isArray(entries)) return false;
  if (entries.length > 0) return true;
  return !isStreamsUltraLoadingPlaceholder(json);
}
