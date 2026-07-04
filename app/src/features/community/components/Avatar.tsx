import type { CommunityUser } from '../types';

export function Avatar({
  user,
  name,
  url,
  large,
}: {
  user?: CommunityUser;
  name?: string;
  url?: string | null;
  large?: boolean;
}) {
  const label = user?.displayName || name || '?';
  const source = user?.avatarUrl || url;
  return (
    <span className={`community-avatar${large ? ' is-large' : ''}`}>
      <span>{label.slice(0, 1).toUpperCase()}</span>
      {source ? (
        <img
          src={source}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </span>
  );
}
