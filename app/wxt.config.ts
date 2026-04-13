import { defineConfig } from 'wxt';
import { KING_LMS_ORIGIN, PORTAL_ORIGIN } from './src/shared/constants';

type WxtGeckoBaseline = {
  id?: string;
  strict_min_version?: string;
  strict_max_version?: string;
  update_url?: string;
};

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'KCG Portal Redesign Project',
    version: '3.0.7',
    description:
      'Modern, readable UI for the Kyoto Computer Gakuin student portal (home.kcg.ac.jp). Unofficial theme extension.',
    author: 'nnnnnnn0090',
    minimum_chrome_version: '111',
    permissions: ['storage'],
    host_permissions: [
      `${PORTAL_ORIGIN}/*`,
      `${KING_LMS_ORIGIN}/*`,
    ],
    browser_specific_settings: {
      gecko: {
        id: 'kcg-portal-redesign-project@nnnnnnn0090.com',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      } as WxtGeckoBaseline,
      gecko_android: { strict_min_version: '142.0' },
    },
  },
});
