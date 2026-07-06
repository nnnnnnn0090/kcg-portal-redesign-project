let apiOrigin = '';
let loginId = '';

export function setCommunityApiOrigin(origin: string): void {
  const value = origin.trim();
  apiOrigin = value ? new URL(value).origin : '';
}

export function getCommunityApiOrigin(): string {
  if (!apiOrigin) throw new Error('みんなの活動の接続先が未設定です');
  return apiOrigin;
}

export function setCommunityRequestLoginId(value: string | null | undefined): void {
  loginId = value?.trim() ?? '';
}

export function getCommunityRequestLoginId(): string {
  return loginId;
}
