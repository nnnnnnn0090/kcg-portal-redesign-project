/**
 * ホーム表示時に KogiNews API を先読みする（MAIN ワールドのフックがキャッシュする）。
 */

import { useEffect } from 'react';
import { urls, pageFetch } from '../lib/api';

export function useKogiNewsPrefetch(): void {
  useEffect(() => {
    void pageFetch(urls.kogiNews());
  }, []);
}
