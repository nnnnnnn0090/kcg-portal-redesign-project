import { cn } from '../../../lib/cn';

export function VerifiedBadge({
  ja,
  large,
  className,
}: {
  ja: boolean;
  large?: boolean;
  className?: string;
}) {
  const label = ja ? '認証済みアカウント' : 'Verified account';
  return (
    <svg
      className={cn(
        'community-verified-badge tw-inline-block tw-flex-none tw-align-[-0.15em]',
        large ? 'tw-h-[22px] tw-w-[22px]' : 'tw-h-[15px] tw-w-[15px]',
        className,
      )}
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path
        className="tw-fill-community-accent-light"
        d="M12 1.5l2.35 1.72 2.9-.28 1.2 2.66 2.66 1.2-.28 2.9L22.5 12l-1.72 2.35.28 2.9-2.66 1.2-1.2 2.66-2.9-.28L12 22.5l-2.35-1.72-2.9.28-1.2-2.66-2.66-1.2.28-2.9L1.5 12l1.72-2.35-.28-2.9 2.66-1.2 1.2-2.66 2.9.28L12 1.5z"
      />
      <path
        className="tw-fill-none tw-stroke-white tw-stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]"
        d="m8 12.2 2.7 2.7L16 9.3"
      />
    </svg>
  );
}
