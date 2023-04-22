import v4 from 'uuid/v4';
import {
  isMigrationCompleted,
  setMigrationCompleted
} from './migrations';

function deepClone(object) {
  return JSON.parse(JSON.stringify(object));
}

// MIGRATION(ryan) 2020-09-16_analytics_id_to_user_guid
// This migration moves the analytics id that was generated and owned by
// analytics module to a common location representing the user's
// identity everywhere in the application.
function migrateAnalyticsIdToUserGuid(state) {
  const MIGRATION_KEY = '2020-09-16_analytics_id_to_user_guid';
  const {
    user
  } = state;

  let newState = deepClone(state);

  if (!isMigrationCompleted(MIGRATION_KEY, state)) {
    const GA_ID = 'googleAnalyticsId';
    const analyticsId = localStorage.getItem(GA_ID);

    // Does this user already have an analytics id?
    // If so, use it as our guid. Otherwise, we do nothing.
    if (analyticsId) {
      newState.user = {
        ...user,
        guid: analyticsId,
      };
    }

    newState = setMigrationCompleted(MIGRATION_KEY, newState);
  }

  return newState;
}

function initializeUserIdentity(state) {
  const {
    user
  } = state;

  const newState = deepClone(state);

  // generate player GUID, if one doesn't already exist
  if (!user.guid) {
    newState.user = {
      ...user,
      guid: v4(),
    };
  }

  return newState;
}

export {
  migrateAnalyticsIdToUserGuid,
  initializeUserIdentity
};