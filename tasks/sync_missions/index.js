const chalk = require('chalk');
const { db } = require('../shared/firebase');
const { getBundledExtensionPaths } = require('../utils/bundledExtensions');
const { readLevels } = require('../utils/readLevels');
const withActionsErrorReporting = require('../utils/withActionsErrorReporting');

async function syncLevels(levels) {
  const missionsRef = db.collection('missions');

  const batch = db.batch();

  levels.forEach(level => {
    const missionRef = missionsRef.doc(level.levelName);

    const objectives = level.missionData.objectives.reduce(
      (objectiveMap, objective) => {
        return {
          ...objectiveMap,
          [objective.objectiveName]: {
            name: objective.title,
            description: objective.description,
            rewards: {
              xp: objective.rewards.xp ?? 0,
            },
          },
        };
      },
      {}
    );

    batch.set(
      missionRef,
      {
        name: level.title,
        description: level.description,
        objectives,
      },
      {
        merge: true,
      }
    );
  });

  await batch.commit();
}

async function run() {
  const extensionPaths = getBundledExtensionPaths();

  console.log(
    chalk`{blue {bold Syncing levels} from repository to firestore from extension directories:}\n${extensionPaths.join(
      '\n'
    )}`
  );

  const readLevelPromises = extensionPaths.map(readLevels);
  const levelsByExtension = await Promise.all(readLevelPromises);
  const levels = levelsByExtension.flat();

  console.log(
    chalk`{blue {bold Found missions:}} ${levels
      .map(level => level.levelName)
      .join(', ')}`
  );

  await syncLevels(levels);

  console.log(chalk`{green {bold Done} syncing missions to firestore!}`);
}

withActionsErrorReporting(run)();
