import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { communityImageFiles, isCommunityImageFile, readImageDataUrl } from '../imageFiles';

const MEBIBYTE = 1_048_576;
const MAX_POST_IMAGES = 4;
const POST_IMAGE_LIMIT = 6 * MEBIBYTE;
const AVATAR_IMAGE_LIMIT = 2 * MEBIBYTE;
const HEADER_IMAGE_LIMIT = 5 * MEBIBYTE;

interface CommunityImageInputOptions {
  ja: boolean;
  setError: (value: string) => void;
  setPostImages: Dispatch<SetStateAction<string[]>>;
  setAvatarImage: (value: string) => void;
  setHeaderImage: (value: string) => void;
}

export function useCommunityImageInputs({
  ja,
  setError,
  setPostImages,
  setAvatarImage,
  setHeaderImage,
}: CommunityImageInputOptions) {
  const readSingleImage = useCallback(
    (file: File | undefined, limit: number, setter: (value: string) => void) => {
      if (!file) {
        setter('');
        return;
      }
      if (!isCommunityImageFile(file)) {
        setError(
          ja ? 'JPEG / PNG / WebP 画像を選択してください。' : 'Choose a JPEG, PNG, or WebP image.',
        );
        return;
      }
      if (file.size > limit) {
        setError(
          ja
            ? `画像は${Math.round(limit / MEBIBYTE)}MB以下にしてください。`
            : 'Image is too large.',
        );
        return;
      }
      void readImageDataUrl(file).then(
        (image) => {
          setter(image);
          setError('');
        },
        () => setError(ja ? '画像を読み込めませんでした。' : 'Could not read image.'),
      );
    },
    [ja, setError],
  );

  const readPostFiles = useCallback(
    (files?: FileList | File[] | null) => {
      const rawFiles = Array.from(files ?? []);
      if (!rawFiles.length) return;
      const selected = communityImageFiles(rawFiles).slice(0, MAX_POST_IMAGES);
      if (!selected.length) {
        setError(
          ja ? 'JPEG / PNG / WebP 画像を選択してください。' : 'Choose JPEG, PNG, or WebP images.',
        );
        return;
      }
      if (selected.some((file) => file.size > POST_IMAGE_LIMIT)) {
        setError(ja ? '写真は1枚6MBまでです。' : 'Each photo must be 6MB or less.');
        return;
      }
      setError('');
      void Promise.all(selected.map(readImageDataUrl)).then(
        (images) => setPostImages((current) => [...current, ...images].slice(0, MAX_POST_IMAGES)),
        () => setError(ja ? '写真を読み込めませんでした。' : 'Could not read photos.'),
      );
    },
    [ja, setError, setPostImages],
  );

  return {
    readPostFiles,
    readAvatar: (file?: File) => readSingleImage(file, AVATAR_IMAGE_LIMIT, setAvatarImage),
    readHeader: (file?: File) => readSingleImage(file, HEADER_IMAGE_LIMIT, setHeaderImage),
  };
}
