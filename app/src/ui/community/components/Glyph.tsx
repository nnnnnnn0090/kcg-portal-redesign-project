export function Glyph({
  name,
}: {
  name:
    | 'home'
    | 'search'
    | 'plus'
    | 'user'
    | 'users'
    | 'close'
    | 'image'
    | 'heart'
    | 'bookmark'
    | 'comment'
    | 'impression'
    | 'refresh'
    | 'bell'
    | 'settings'
    | 'school'
    | 'tag'
    | 'link'
    | 'clock';
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
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c.4-3.4 2.3-5.1 5.5-5.1" />
        <circle cx="16.2" cy="9" r="2.6" />
        <path d="M12.4 20c.35-2.7 1.7-4.1 3.8-4.1 2.3 0 3.9 1.5 4.3 4.1" />
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
    comment: (
      <>
        <path d="M5 5.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H9l-5 4v-13.5a2 2 0 0 1 2-2Z" />
        <path d="M8 10h8M8 13.5h5" />
      </>
    ),
    impression: (
      <>
        <path d="M5 20V11" />
        <path d="M12 20V6" />
        <path d="M19 20v-8" />
      </>
    ),
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
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M4 12a8 8 0 0 1 .4-2.5l-1.7-1.3 2-3.4 2.1.7A8 8 0 0 1 9.5 4.4L10 2.5h4l.5 1.9a8 8 0 0 1 2.7 1.1l2.1-.7 2 3.4-1.7 1.3a8 8 0 0 1 0 5l1.7 1.3-2 3.4-2.1-.7a8 8 0 0 1-2.7 1.1L14 21.5h-4l-.5-1.9a8 8 0 0 1-2.7-1.1l-2.1.7-2-3.4 1.7-1.3A8 8 0 0 1 4 12Z" />
      </>
    ),
    school: (
      <>
        <path d="m3 10 9-5 9 5-9 5-9-5Z" />
        <path d="M7 12.2V17c0 .8 2.2 2.2 5 2.2s5-1.4 5-2.2v-4.8" />
        <path d="M21 10v6.5" />
      </>
    ),
    tag: (
      <>
        <path d="M3.5 12.5V4.8A1.3 1.3 0 0 1 4.8 3.5h7.7L20.5 11.5l-7.8 7.8Z" />
        <circle cx="8" cy="8" r="1.2" />
      </>
    ),
    link: (
      <>
        <path d="M10 13.5a4 4 0 0 0 6 0l2.5-2.5a4 4 0 0 0-5.7-5.7L11.5 6.5" />
        <path d="M14 10.5a4 4 0 0 0-6 0L5.5 13a4 4 0 0 0 5.7 5.7l1.3-1.2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
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
