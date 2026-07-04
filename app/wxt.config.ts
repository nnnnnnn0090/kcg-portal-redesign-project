import { defineConfig } from 'wxt';
import {
  EXTENSION_PROMO_ORIGIN,
  COMMUNITY_API_ORIGIN,
  HOME2_ORIGIN,
  KING_LMS_ORIGIN,
  PORTAL_ORIGIN,
} from './src/shared/constants';

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
    version: '6.2.2',
    description:
      '京都コンピュータ学院の学生ポータルを見やすく再設計し、さまざまな便利機能を追加する非公式拡張機能です。',
    author: 'nnnnnnn0090' as unknown as { email: string },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    web_accessible_resources: [
      {
        resources: ['community/activity-icon.png'],
        matches: [`${PORTAL_ORIGIN}/*`],
      },
    ],
    minimum_chrome_version: '111',
    permissions: ['storage'],
    host_permissions: [
      `${PORTAL_ORIGIN}/*`,
      `${KING_LMS_ORIGIN}/*`,
      `${EXTENSION_PROMO_ORIGIN}/*`,
      `${HOME2_ORIGIN}/*`,
      `${COMMUNITY_API_ORIGIN}/*`,
    ],
    browser_specific_settings: {
      gecko: {
        id: 'kcg-portal-redesign-project@nnnnnnn0090.com',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
        update_url: 'https://kcg-portal-redesign-project-web.vercel.app/updates.json',
      } as WxtGeckoBaseline,
      gecko_android: { strict_min_version: '142.0' },
    },
  },
});
