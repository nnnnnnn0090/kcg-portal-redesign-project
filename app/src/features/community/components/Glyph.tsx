export function Glyph({
  name,
}: {
  name:
    | 'home'
    | 'search'
    | 'plus'
    | 'user'
    | 'close'
    | 'image'
    | 'heart'
    | 'bookmark'
    | 'refresh'
    | 'bell';
}) {
  const paths = {
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v10h12V10M9 20v-6h6v6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c.5-4.2 2.8-6.3 7-6.3s6.5 2.1 7 6.3" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m4 17 5-5 4 4 2-2 5 4" />
      </>
    ),
    heart: (
      <path d="M20.4 5.6c-1.8-1.8-4.7-1.8-6.5 0L12 7.5l-1.9-1.9c-1.8-1.8-4.7-1.8-6.5 0s-1.8 4.7 0 6.5L12 20.5l8.4-8.4c1.8-1.8 1.8-4.7 0-6.5Z" />
    ),
    bookmark: <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />,
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M18.2 16a8 8 0 1 1 .8-7.1L20 12" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
  };
  return (
    <svg
      className={
        'community-glyph tw-block tw-h-[18px] tw-w-[18px] tw-flex-none tw-fill-none tw-stroke-current tw-stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]'
      }
      viewBox="0 0 24 24"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
