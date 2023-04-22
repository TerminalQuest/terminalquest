import analytics from '../../../js/app/common/analytics';

test('analytics API composition', async () => {
  expect(analytics.initializeAnalytics).toBeDefined();
});
