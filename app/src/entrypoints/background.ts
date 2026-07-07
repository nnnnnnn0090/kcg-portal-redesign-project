import { registerInstallOpenHandlers } from '../services/install-open';

/** 初回インストール時だけ、オンボーディングを開始する学生ポータルを開く。 */
export default defineBackground(() => {
  registerInstallOpenHandlers();
});
