/** 配布 zip（`npm run zip`）のみ true。dev zip / `wxt dev` は false。 */
export function isPortalDistributionBuild(): boolean {
  return import.meta.env.VITE_PORTAL_DISTRIBUTION_BUILD === '1';
}
