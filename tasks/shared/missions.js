const klaw = require('klaw');
const through2 = require('through2');
const path = require('path');
const fs = require('fs').promises;

function isFileObjectiveJson(filePath) {
  if (path.basename(filePath) !== 'objective.json') {
    return false;
  }

  return true;
}

function isFileLevelJson(filePath) {
  if (path.basename(filePath) !== 'level.json') {
    return false;
  }

  return true;
}

function isMission(levelInfo) {
  return levelInfo.is_mission;
}

function getLevelKey(filePath) {
  const levelKeyRegex = /levels\/(.*?)\//;
  const [_, levelKey] = levelKeyRegex.exec(filePath);

  return levelKey;
}

function getObjectiveKey(filePath) {
  const objectiveKeyRegex = /objectives\/(.*?)\//;
  const [_, objectiveKey] = objectiveKeyRegex.exec(filePath);

  return objectiveKey;
}

async function readMissions(directory) {
  const missions = await new Promise((resolve, reject) => {
    const fileNames = [];

    klaw(directory)
      .pipe(
        through2.obj(function(item, enc, next) {
          if (isFileLevelJson(item.path) || isFileObjectiveJson(item.path)) {
            this.push(item);
          }
          next();
        })
      )
      .on('data', item => {
        fileNames.push(item.path);
      })
      .on('end', async () => {
        const filePromises = fileNames.map(async path => {
          return {
            path,
            data: JSON.parse(await fs.readFile(path, 'utf-8')),
          };
        });
        const files = await Promise.all(filePromises);

        // create a map to record our missions in
        const missions = {};

        // add all missions to our Map
        files
          // we only want to deal with levels that are missions
          .filter(({ path }) => isFileLevelJson(path))
          .filter(({ data }) => isMission(data))
          .forEach(file => {
            const levelKey = getLevelKey(file.path);

            // add mission to map
            missions[levelKey] = { ...file, objectives: {} };
          });

        // add objectives to their respective missions
        files
          // we only want to deal with objectives for our listed missions here
          .filter(({ path }) => isFileObjectiveJson(path))
          .filter(({ path }) => {
            const levelKey = getLevelKey(path);

            // if this level is in our missions list, it's a mission
            return Boolean(missions[levelKey]);
          })
          .forEach(file => {
            const levelKey = getLevelKey(file.path);
            const objectiveKey = getObjectiveKey(file.path);

            // add objective to mission
            const mission = missions[levelKey];
            missions[levelKey] = {
              ...mission,
              objectives: { ...mission.objectives, [objectiveKey]: file.data },
            };
          });

        resolve(missions);
      });
  });

  return missions;
}

module.exports = {
  readMissions,
};
