/** 依存ゼロの検証プリミティブ（§10.1）。 */

export type Result<T> = { ok: true; value: T } | { ok: false };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(): Result<T> {
  return { ok: false };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseString(value: unknown, maxLen?: number): Result<string> {
  if (typeof value !== 'string') return fail();
  const trimmed = value.trim();
  if (maxLen !== undefined && trimmed.length > maxLen) return fail();
  return ok(trimmed);
}

export function parseBool(value: unknown, defaultValue?: boolean): Result<boolean> {
  if (typeof value === 'boolean') return ok(value);
  if (defaultValue !== undefined) return ok(defaultValue);
  return fail();
}

export function parseArray<T>(
  value: unknown,
  itemParser: (item: unknown) => Result<T>,
): Result<T[]> {
  if (!Array.isArray(value)) return fail();
  const out: T[] = [];
  for (const item of value) {
    const parsed = itemParser(item);
    if (!parsed.ok) return fail();
    out.push(parsed.value);
  }
  return ok(out);
}

export function parseUnion<T extends string>(
  value: unknown,
  allowed: readonly T[],
  defaultValue?: T,
): Result<T> {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return ok(value as T);
  }
  if (defaultValue !== undefined) return ok(defaultValue);
  return fail();
}

export function parseOptionalString(value: unknown, maxLen?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = parseString(value, maxLen);
  return parsed.ok ? parsed.value : undefined;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
