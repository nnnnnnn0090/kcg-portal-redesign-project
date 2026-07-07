const COMMUNITY_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isCommunityImageFile(file: File): boolean {
  return COMMUNITY_IMAGE_TYPES.has(file.type);
}

export function communityImageFiles(files?: FileList | File[] | null): File[] {
  return Array.from(files ?? []).filter(isCommunityImageFile);
}

export function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes('Files');
}

export function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
