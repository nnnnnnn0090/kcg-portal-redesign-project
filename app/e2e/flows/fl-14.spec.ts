import { openPortalHome } from '../support/flow-helpers';
import {
  resetDeveloperSurveyAnswered,
  submitDeveloperSurveyForm,
  waitForDeveloperSurveyPanel,
} from '../support/real-server-helpers';
import { readExtensionStorage, SK } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-14 developer survey', () => {
  skipUnlessRealServerReady();

  test('survey panel → answer → storage recorded', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    await resetDeveloperSurveyAnswered(worker);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    const hasSurvey = await waitForDeveloperSurveyPanel(page);
    test.skip(!hasSurvey, 'no active developer survey on production web');
    await submitDeveloperSurveyForm(page);

    const storage = await readExtensionStorage(worker, [SK.developerSurveyAnswered]);
    const answered = storage[SK.developerSurveyAnswered];
    expect(Array.isArray(answered)).toBe(true);
    expect((answered as string[]).length).toBeGreaterThan(0);
  });
});
