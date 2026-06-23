/** セマンティック風の a > b（数値セグメント比較。プレリリース等は先頭数字のみ見る） */
export function semverSegments(v: string): number[] {
  return v.split('.').map((part) => {
    const n = parseInt(String(part).replace(/^(\d+).*/, '$1'), 10);
    return Number.isFinite(n) ? n : 0;
  });
}

export function semverGreater(a: string, b: string): boolean {
  const pa = semverSegments(a);
  const pb = semverSegments(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return false;
}
