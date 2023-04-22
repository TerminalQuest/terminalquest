const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { readLevels } = require('./utils/readLevels');

/**
 * This task was created to aid with ensuring that extensions have the
 * appropriate objectives listed in their manifests.
 *
 * Some example usage here:
 *
 * node tasks/audit_objectives.js ~/git/tq-extensions-folder/twilioquest-javascript/
 *
 * This --only-show-changes flag will show objective keys in green
 * that are in a map and have a folder that are not listed in the
 * manifest. Frequently, these green keys should be added to the manifest.
 * Red keys show up in the manifest but are not in a map or do not
 * have a folder. These should usually be removed from the manifest.
 *
 * node tasks/audit_objectives.js ~/git/tq-extensions-folder/twilioquest-javascript/ --only-show-changes
 */

function findMaxInArray(array, evaluator) {
  let maxValue = Number.MIN_VALUE;

  if (array.length === 0) {
    return undefined;
  }

  array.forEach(value => {
    const evaluatedValue = evaluator(value);

    if (evaluatedValue > maxValue) {
      maxValue = evaluatedValue;
    }
  });

  return maxValue;
}

function combineWithoutDuplicates(...arrays) {
  const noDuplicates = new Set();

  arrays.forEach(array => {
    array.forEach(value => {
      noDuplicates.add(value);
    });
  });

  return [...noDuplicates];
}

function getAllObjectives(level) {
  const objectivesManifest = level.objectives ?? [];
  const objectiveFolders = level.missionData.objectives.map(
    objective => objective.objectiveName
  );

  return combineWithoutDuplicates(objectiveFolders, objectivesManifest);
}

function checkObjectives(level) {
  const objectivesManifest = level.objectives ?? [];
  const objectiveFolders = level.missionData.objectives.map(
    objective => objective.objectiveName
  );
  const objectivesInMaps = level.missionData.maps
    .map(map => map.data.layers.filter(layer => layer.type === 'objectgroup'))
    .flat()
    .map(layer => layer.objects)
    .flat()
    .map(object => object.properties)
    .flat()
    .filter(property => property?.name === 'objectiveName')
    .map(property => property.value);

  const allObjectives = getAllObjectives(level);

  return allObjectives.map(objective => {
    return {
      key: objective,
      isInManifest: objectivesManifest.includes(objective),
      isInFolders: objectiveFolders.includes(objective),
      isInMaps: objectivesInMaps.includes(objective),
    };
  });
}

function printLevelObjectiveTable(level) {
  const allObjectives = getAllObjectives(level);
  const objectiveData = checkObjectives(level);

  const longestObjectiveLength = findMaxInArray(
    allObjectives,
    objective => objective.length
  );

  const headerLine =
    'Manifest'.padEnd(longestObjectiveLength, ' ') +
    '\t' +
    'Folders'.padEnd(longestObjectiveLength, ' ') +
    '\t' +
    'Maps'.padEnd(longestObjectiveLength, ' ');
  const lines = [headerLine];

  objectiveData.forEach(objective => {
    let line = '';

    // manifest
    const paddedObjectiveKey = objective.key.padEnd(
      longestObjectiveLength,
      ' '
    );

    if (objective.isInManifest) {
      line += chalk`{green ${paddedObjectiveKey}}`;
    } else {
      line += chalk`{red ${paddedObjectiveKey}}`;
    }

    line += '\t';

    if (objective.isInFolders) {
      line += chalk`{green ${paddedObjectiveKey}}`;
    } else {
      line += chalk`{red ${paddedObjectiveKey}}`;
    }

    line += '\t';

    if (objective.isInMaps) {
      line += chalk`{green ${paddedObjectiveKey}}`;
    } else {
      line += chalk`{red ${paddedObjectiveKey}}`;
    }

    lines.push(line);
  });

  console.log(lines.join('\n'));
}

function printObjectivesMissingFromManifest(level) {
  const objectiveData = checkObjectives(level);

  let lines = [];

  lines.push(
    chalk`These objectives should probably be {green ADDED} to the manifest:`
  );
  objectiveData.forEach(objective => {
    if (
      !objective.isInManifest &&
      objective.isInFolders &&
      objective.isInMaps
    ) {
      // These objectives should probably be added to the manifest
      lines.push(chalk`{green ${objective.key}}`);
    }
  });

  lines.push(
    chalk`These objectives should probably be {red REMOVED} from the manifest:`
  );
  objectiveData.forEach(objective => {
    if (
      objective.isInManifest &&
      (!objective.isInFolders || !objective.isInMaps)
    ) {
      // These objectives should probably be removed from the manifest
      lines.push(chalk`{red ${objective.key}}`);
    }
  });

  console.log(lines.join('\n'));
}

readLevels(process.argv[2]).then(levels => {
  levels.forEach(level => {
    console.log(chalk`{bold Level:} ${level.title} (${level.levelName})`);

    if (process.argv[3] === '--only-show-changes') {
      printObjectivesMissingFromManifest(level);
    } else {
      printLevelObjectiveTable(level);
    }
  });
});
