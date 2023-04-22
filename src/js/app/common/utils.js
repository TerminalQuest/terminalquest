const omitKey = omittedKey => object => {
  const entries = Object.entries(object);
  const remainingEntries = entries.filter(([key]) => key !== omittedKey);

  return reduceEntries(remainingEntries);
};

function reduceEntries(entries) {
  return entries.reduce(
    (object, [key, value]) => ({
      ...object,
      [key]: value,
    }),
    {}
  );
}

/**
 * Remove all duplicate entries from an array as defined by a strict
 * equality check (===).
 *
 * @param {*[]} array
 */
function removeDuplicates(array) {
  const noDuplicates = new Set();

  array.forEach(item => noDuplicates.add(item));

  return [...noDuplicates];
}

/**
 * Deeply recurses through all of an object's properties and logs them as part of inline groups.
 *
 * @param {object} obj - The object that will be recursed
 * @param {string} [rootGroup] - An optional log group that will wrap the rest of the output
 */
function prettyLog(obj, rootGroup = '') {
  if (rootGroup) console.group(rootGroup);

  if (typeof obj === 'object') {
    for (const key in obj) {
      const property = obj[key];

      if (Object.getOwnPropertyNames(property).length === 0) continue;

      console.groupCollapsed(key);
      prettyLog(obj[key]);
      console.groupEnd();
    }
  } else console.log(obj);

  if (rootGroup) console.groupEnd();
}

export { omitKey, reduceEntries, removeDuplicates, prettyLog };
