import isDev from 'electron-is-dev';
import config from '../config/config';
import ga from './analytics';
import { staticFilePath } from './fs_utils';

const GAME_VERSION = require(staticFilePath('package.json')).version;

async function logMissionObjectiveCompletion(context, liveEvent) {
  /*
  // Get app version - will be electron version in dev, actual app version in prod
  const appVersion = GAME_VERSION;
  const userAgent = `${window.navigator.userAgent} // ${appVersion}`;

  const eventData = {
    accountSid: (context.env.TQ_TWILIO_ACCOUNT_SID || { value: null }).value,
    githubId: (context.env.TQ_GITHUB_USERNAME || { value: null }).value,
    analyticsId: ga.analyticsId,
    appType: 'desktop' + (isDev ? '-dev' : ''),
    appVersion: appVersion,
    eventDataLevel: context.hackObject.level.levelName,
    eventDataObjective: context.hackObject.objectiveName,
    eventDataRewardEarned: context.objective.rewards.items || [],
    eventDataXpEarned: context.objective.rewards.xp || 0,
    eventType: 'objective_completed',
    liveEventId: liveEvent ? liveEvent.guid : null,
    liveEventName: liveEvent ? liveEvent.id : null,
    playerName: context.settings.name,
    userAgent: userAgent,
    userId: null, // TODO: We'll have a unique user id when we implement auth/identity
    localDatetime: new Date(),
  };

  await fetch(config.apiBaseUrl + 'game-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  console.log(eventData);
  */
}

export default {
  logMissionObjectiveCompletion,
};
