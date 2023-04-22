import config from '../../config/config';
import { getContext } from './index';
import { describeSchema } from './schema';

function mapLoadoutToItemKeys(loadout) {
  const loadoutEntries = Object.entries(loadout);
  const mappedToKeys = loadoutEntries
    // filter out falsy items (empty loadout slots)
    .filter(([, item]) => Boolean(item));

  return mappedToKeys.reduce((loadoutObject, [slot, itemKey]) => {
    return {
      ...loadoutObject,
      [slot]: itemKey,
    };
  }, {});
}

function mapAchievementsToFirestoreFormat(achievements) {
  return Object.values(achievements).map(
    ({ missionName, objectiveName, completedOn }) => ({
      mission: missionName,
      objective: objectiveName,
      completedOn,
    })
  );
}

/**
 * Sync local user data from context into firebase
 *
 * @param {object} context - entire context object
 */
async function syncToFirebase(context) {
  const data = {
    guid: context.user.guid,
    name: context.settings.name,
    avatar: context.settings.avatar,
    customAvatar: context.customAvatar,
    loadout: mapLoadoutToItemKeys(context.loadout),
    achievements: mapAchievementsToFirestoreFormat(context.completedObjectives),
    teams: context.teams.joined.map(team => team.id),
    operations: context.operations.joined.map(operation => operation.id),
  };

  try {
    await fetch(config.apiBaseUrl + 'api/v1/user-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error(err);
  }
}

function getKeysToBeSyncedToBackend() {
  const schemaDescription = describeSchema();

  return Object.entries(schemaDescription.fields)
    .filter(([, field]) => field.meta && field.meta.syncToBackend)
    .map(([fieldKey]) => fieldKey);
}

/**
 * Checks if the given context slice should trigger a
 * call to synchronize this data to firebase.
 *
 * @param {object} newContextSlice - slice of context keys and values
 * @returns {boolean}
 */
function shouldContextSliceTriggerFirebaseSync(newContextSlice) {
  return Object.keys(newContextSlice).some(updatedKey =>
    getKeysToBeSyncedToBackend().includes(updatedKey)
  );
}

/**
 * Higher order function that will only invoke its callback
 * once the returned function hasn't been invoked for the
 * debouncePeriod.
 *
 * This is a trailing edge debounce, so subsequent invocations
 * will restart the debouncePeriod timer. This means the callback
 * may not be invoked for MORE time than the debounce period.
 *
 * @example
 * const debouncedCallback = debounceTrailingEdge(1000, callback);
 * debouncedCallback();
 * // 999ms elapse - callback is NOT invoked
 * debouncedCallback();
 * // 1000ms elapse - callback is invoked
 *
 * @param {function} callback - the function to be debounced
 * @param {number} debouncePeriod - the period in ms
 * @returns {function} - debounced callback
 */
function debounceTrailingEdge(callback, debouncePeriod) {
  let timeout;

  return function(...args) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => callback(...args), debouncePeriod);
  };
}

const debouncedSyncToFirebase = debounceTrailingEdge(
  context => syncToFirebase(context),
  1000
);

function syncContext(newContextSlice) {
  const context = getContext();

  if (shouldContextSliceTriggerFirebaseSync(newContextSlice)) {
    debouncedSyncToFirebase(context);
  }
}

export { syncContext };
