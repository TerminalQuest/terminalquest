import * as yup from 'yup';
import { stripIndents } from 'common-tags';
import DynamicLevel from '../../components/game/DynamicLevel';

export const NUM_AVATARS = 6;

function getLevelSchema() {
  return yup.object().isInstanceOf(DynamicLevel);
}

function getHackObjectSchema() {
  return yup.object().shape({
    level: getLevelSchema().required(),
    objectiveName: yup
      .string()
      .strict()
      .required(),
    complete: yup.boolean().default(false),
    markAsComplete: yup
      .mixed()
      .func()
      // .default takes a function to allow you to dynamically
      // construct a "default" value. In this case we want the
      // default value to be a NOOP function. We cannot just pass a NOOP
      // though because it will be evaluated by yup and resolve to undefined.
      // This is why we have a curried NOOP instead.
      //
      // https://github.com/jquense/yup#mixeddefaultvalue-any-schema
      .default(() => () => {}),
  });
}

function getContextSchema() {
  return yup
    .object()
    .shape({
      showTitle: yup.boolean(),
      hasSeenCinematic: yup.boolean().meta({
        saveToDisk: true,
      }),
      showOnboarding: yup.boolean(),
      showMissionComputer: yup.boolean(),
      systemInfo: yup
        .object()
        .meta({
          syncToBackend: false,
          saveToDisk: false,
        })
        .shape({
          os: yup.string(),
          pi: yup.boolean(),
        }),
      completedObjectives: yup
        .object()
        .meta({
          syncToBackend: true,
          saveToDisk: true,
        })
        .map({
          keySchema: yup.string().isObjectiveKey(),
          valueSchema: yup
            .object()
            .shape({
              missionName: yup.string(),
              objectiveName: yup.string(),
              completedOn: yup.date(),
            })
            .noUnknown(),
        }),
      contextInitialized: yup.boolean().default(false),
      questStatus: yup.object().meta({
        saveToDisk: true,
      }),
      customAvatar: yup
        .object()
        .meta({
          syncToBackend: true,
          saveToDisk: true,
        })
        .shape({
          sc: yup.number().default(0),
          ec: yup.number().default(0),
          hc: yup.number().default(0),
          hs: yup.number().default(0),
          uri: yup.string().default(''),
        }),
      env: yup
        .object()
        .meta({
          saveToDisk: true,
        })
        .map({
          keySchema: yup.string(),
          valueSchema: yup
            .object()
            .shape({
              name: yup.string(),
              value: yup.string(),
              concealed: yup.boolean(),
            })
            .noUnknown(),
        }),
      extensions: yup
        .object()
        .meta({
          saveToDisk: true,
        })
        .shape({
          enabled: yup.boolean(),
          directory: yup.string().nullable(),
        }),
      items: yup.object(),
      inventory: yup
        .array()
        .meta({
          saveToDisk: true,
        })
        .of(yup.string().isItemKey()),
      levelState: yup.object().meta({
        saveToDisk: true,
      }), // TODO: 7/14/20
      liveEvent: yup
        .object()
        .meta({
          saveToDisk: true,
        })
        .nullable(),
      loadout: yup.object().meta({
        saveToDisk: true,
        syncToBackend: true,
      }), // TODO: 7/14/20
      migrations: yup
        .object()
        .meta({
          saveToDisk: true,
        })
        .map({
          keySchema: yup.string(),
          valueSchema: yup.boolean(),
        }),
      settings: yup
        .object()
        .meta({
          saveToDisk: true,
          syncToBackend: true,
        })
        .shape({
          avatar: yup
            .number()
            .default(1)
            .integer()
            .min(0)
            .max(NUM_AVATARS),
          name: yup.string(),
        })
        .noUnknown(),
      teams: yup
        .object()
        .meta({
          syncToBackend: true,
          saveToDisk: true,
        })
        .shape({
          joined: yup.array().of(
            yup.object().shape({
              id: yup.string().required(),
              joinCode: yup.string().required(),
              displayName: yup.string(),
            })
          ),
        }),
      operations: yup
        .object()
        .meta({
          syncToBackend: true,
          saveToDisk: true,
        })
        .shape({
          joined: yup.array().of(
            yup.object().shape({
              id: yup.string().required(),
              joinCode: yup.string().required(),
              displayName: yup.string(),
            })
          ),
        }),
      unlockCodes: yup
        .array()
        .of(yup.string())
        .meta({
          saveToDisk: true,
        })
        .nullable(),
      user: yup
        .object()
        .meta({
          persistOnClearProgess: true,
          syncToBackend: true,
          saveToDisk: true,
        })
        .shape({
          guid: yup.string(),
        })
        .default({})
        .noUnknown(),
      xp: yup
        .number()
        .meta({
          saveToDisk: true,
        })
        .required()
        .min(0)
        .integer(),
      toastMessage: yup.string().nullable(),
      conversationNpc: yup.object().nullable(),
      hackObject: getHackObjectSchema().nullable(),
      currentMenu: yup
        .object()
        .shape({
          name: yup.string().required(),
          subnav: yup.string(),
        })
        .nullable(),
      currentLevel: yup
        .object()
        .shape({
          levelName: yup.string(),
          playerEntryPoint: yup.string(),
          levelMapName: yup.string(),
        })
        .nullable()
        .noUnknown(),
      numObjectives: yup.number().nullable(),
      dragItem: yup
        .string()
        // .isItemKey() // < intent is to eventually validate item ID
        .nullable(),
      overlayComponent: yup
        .mixed()
        .test(
          'is-string-or-component-object',
          '${path} is not a string or object',
          value => {
            switch (typeof value) {
              case 'object':
                return yup
                  .object()
                  .shape({
                    key: yup.string(),
                    props: yup.object(),
                  })
                  .isValidSync(value);
              case 'string':
              default:
                return yup.string().isValidSync(value);
            }
          }
        ),
    })
    .noUnknown();
}

/**
 * @typedef {Object} ValidationResult
 * @property {string} key - Which context key does this result correspond to
 * @property {boolean} valid - Did this validated update match the expected schema
 * @property {Object} update - The newly updated and type casted context object slice
 * @property {Object} error - The yup.js ValidationError that occured, if one occured
 */

/**
 * Validate a context update to ensure it meets the expected schema. This
 * function logs validation errors to the terminal as they occur.
 *
 * @param {object} newContext - slice of context to be updated
 * @returns {ValidationResult[]} results
 */
function validateContextUpdate(newContext) {
  return Object.entries(newContext).map(([key, value]) => {
    const keySchema = yup.reach(getContextSchema(), key);

    try {
      keySchema.validateSync(value);

      return {
        key,
        valid: true,
        update: keySchema.cast(value), // { stripUnknown: true }),
      };
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        throw error;
      }

      console.error(stripIndents`
            Schema Validation Error
            Context Path: ${key}
            ---
            ${error.errors.join('\n')}
          `);
      console.error(error);

      return {
        key,
        valid: false,
        error,
      };
    }
  });
}

/**
 * Convert an array of entries as generated by Object.entries
 * back into an object.
 *
 * @param {Array} entries - Array of [key, value] tuples
 * @example
 * const obj = { a: 1, b: 2 };
 *
 * const entries = Object.entries(obj);
 * // entries === [['a', 1], ['b', 2]]
 *
 * entries[0] = ['c', 3];
 *
 * const reduced = reduceEntries(entries);
 * // reduced === { c: 3, b: 2 }
 */
function reduceEntries(entries) {
  return entries.reduce(
    (object, [key, value]) => ({
      ...object,
      [key]: value,
    }),
    {}
  );
}

function describeSchema() {
  return getContextSchema().describe();
}

export {
  getContextSchema,
  getHackObjectSchema,
  validateContextUpdate,
  reduceEntries,
  describeSchema,
};
