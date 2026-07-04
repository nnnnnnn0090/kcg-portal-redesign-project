import { useEffect, useRef } from 'react';

export function useObjectUrlRegistry() {
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach(URL.revokeObjectURL);
      urls.current = [];
    },
    [],
  );

  return urls;
}
