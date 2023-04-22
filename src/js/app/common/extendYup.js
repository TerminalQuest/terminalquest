import * as yup from 'yup';
import { stripIndents } from 'common-tags';

/**
 * Yup supports custom validation types/functions/extension.
 *
 * This functions by using the `addMethod` feature to modify the
 * prototypes of the base yup validation types.
 *
 * Because we're directly modifying the prototypes of an external
 * module we want to do this exactly once in a clearly defined
 * location.
 *
 * We'll invoke this function once at app start-up and all modifications
 * to yup prototypes should happen here.
 */
function extendYup() {
  yup.addMethod(yup.mixed, 'func', function() {
    return this.test('is-function', '${path} is not a function!', function(
      value
    ) {
      /**
       * This test function does not determine if a function is nullable
       * or undefined. Subsequent chained tests of .required() or .defined()
       * can make this determination on a per schema basis.
       *
       * https://github.com/jquense/yup/issues/1055#issuecomment-702106302
       */
      if (value === null || value === undefined) {
        return true;
      }

      return typeof value === 'function';
    });
  });

  yup.addMethod(yup.object, 'map', function({ keySchema, valueSchema }) {
    return this.test(
      'is-map',
      stripIndents`
        \${path} is not a map with
        key: ${keySchema.describe().type}
        value: ${valueSchema.describe().type}`,
      function(potentialMap) {
        // Copy the nullable check implemented in yup.mixed.isType
        // https://github.com/jquense/yup/blob/master/src/mixed.js#L166
        //
        // Calling isType directly does not work because it doesn't resepect
        // this custom test we've added.
        //
        // There is a chance that this will break if the implementation of this
        // feature in yup changes.
        if (this.schema._nullable && potentialMap === null) {
          return true;
        }

        return Object.entries(potentialMap).every(([key, value]) => {
          return keySchema.isValidSync(key) && valueSchema.isValidSync(value);
        });
      }
    );
  });

  yup.addMethod(yup.object, 'isInstanceOf', function(object) {
    return this.test(
      'is-instanceof',
      `\${path} is not an instance of ${object}!`,
      function(value) {
        return value instanceof object;
      }
    );
  });

  yup.addMethod(yup.string, 'isObjectiveKey', function() {
    return this.test(
      'is-objective-key',
      `\${path} is not in a valid objective key format!`,
      function(value) {
        const [levelName, objectiveName, ...rest] = value.split('.');

        return (
          yup.string().isValidSync(levelName) &&
          yup.string().isValidSync(objectiveName) &&
          yup
            .array()
            .max(0)
            .isValidSync(rest)
        );
      }
    );
  });

  yup.addMethod(yup.string, 'isItemKey', function() {
    return this.test('is-item-key', `\${path} is not in a item key!`, function(
      value
    ) {
      return yup.string().isValidSync(value);
    });
  });
}

export default extendYup;
