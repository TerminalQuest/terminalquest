const jetpack = require('fs-jetpack');
const path = require('path');

const LEVEL_DIR_NAME = 'levels';
const LEVEL_FILE_NAME = 'level.json';

function isMission(levelInfo) {
  return levelInfo.is_mission;
}

function isValidLevel(levelDir, levelInfoPath) {
  return jetpack.exists(levelDir) === 'dir' && jetpack.exists(levelInfoPath);
}

function constructLevelsDir(extensionPath) {
  return path.join(extensionPath, LEVEL_DIR_NAME);
}

async function readLevelInfoFile(extensionPath, levelName) {
  const levelsDir = constructLevelsDir(extensionPath);
  const levelDir = path.join(levelsDir, levelName);
  const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

  return JSON.parse(await jetpack.read(levelInfoPath));
}

async function writeLevelInfoFile(extensionPath, levelName, levelInfo) {
  const levelsDir = constructLevelsDir(extensionPath);
  const levelDir = path.join(levelsDir, levelName);
  const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

  const levelInfoString = JSON.stringify(levelInfo, undefined, 2) + '\n';
  return jetpack.writeAsync(levelInfoPath, levelInfoString);
}

async function populateObjectives({
  folderNames,
  objectivesDirPath,
  levelInfo,
}) {
  const objectiveFolders = folderNames.filter(folder => {
    const objectiveFolderPath = path.join(objectivesDirPath, folder);

    return jetpack.exists(objectiveFolderPath) === 'dir';
  });

  await Promise.all(
    objectiveFolders.map(async objectiveFolder => {
      // Only attempt if the folder has an objective.json
      const objJsonPath = path.join(
        objectivesDirPath,
        objectiveFolder,
        'objective.json'
      );
      const jsonExists = await jetpack.existsAsync(objJsonPath);
      if (!jsonExists) {
        return;
      }

      const objectiveInfo = JSON.parse(await jetpack.read(objJsonPath));
      objectiveInfo.objectiveName = objectiveFolder;

      // Total up all XP for this mission
      if (objectiveInfo.rewards && objectiveInfo.rewards.xp) {
        levelInfo.xp += objectiveInfo.rewards.xp;
      }

      levelInfo.objectives.push(objectiveInfo);
    })
  );
}

async function getMissionInfo(extensionPath, missionDir, missionFolder) {
  const levelInfo = {};

  // Add info necessary to launch/load levels
  const levelsDir = constructLevelsDir(extensionPath);
  levelInfo.icon = path.join(levelsDir, missionFolder, 'mission_icon.png');
  levelInfo.xp = 0;
  levelInfo.objectives = [];

  const objectivesDirPath = path.join(missionDir, 'objectives');
  const folderNames = await jetpack.list(objectivesDirPath);

  if (folderNames) {
    // This mission has objectives
    populateObjectives({ folderNames, objectivesDirPath, levelInfo });
  }

  levelInfo.maps = [];
  const mapsDirPath = path.join(missionDir, 'maps');
  const oldLevelFilePath = path.join(missionDir, 'map.json');

  if (await jetpack.existsAsync(oldLevelFilePath)) {
    // if old level file exists, don't look for maps
    const mapData = JSON.parse(await jetpack.read(oldLevelFilePath));
    levelInfo.maps.push({
      mapName: 'map',
      data: mapData,
    });
  } else {
    const mapNameList = await jetpack.listAsync(mapsDirPath);

    const maps = await Promise.all(
      mapNameList
        .filter(mapName => {
          return path.extname(mapName) === '.json';
        })
        .map(async mapName => {
          const mapPath = path.join(mapsDirPath, mapName);
          const rawData = await jetpack.read(mapPath);

          let data;

          try {
            data = JSON.parse(rawData);
          } catch (err) {
            console.error(
              `Failed to parse map "${mapName}" with path "${mapPath}". Skipping this map.
            
            --- Error ---
            ${err}`
            );
            return;
          }

          const mapInfo = {
            mapName: path.parse(mapName).name,
            data,
          };

          return mapInfo;
        })
    );

    levelInfo.maps = maps;
  }

  return levelInfo;
}

async function readLevels(extensionPath) {
  const levelsDir = path.join(extensionPath, LEVEL_DIR_NAME);
  const levelsDirContents = await jetpack.listAsync(levelsDir);

  const levelFolders = levelsDirContents.filter(folder => {
    const levelDir = path.join(levelsDir, folder);
    const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

    return isValidLevel(levelDir, levelInfoPath);
  });

  const levels = await Promise.all(
    levelFolders.map(async folder => {
      const levelDir = path.join(levelsDir, folder);

      let levelInfo = await readLevelInfoFile(extensionPath, folder);
      levelInfo.levelName = folder;

      const missionInfo = await getMissionInfo(extensionPath, levelDir, folder);
      levelInfo.missionData = missionInfo;

      return levelInfo;
    })
  );

  return levels;
}

module.exports = {
  readLevels,
  isMission,
  readLevelInfoFile,
  writeLevelInfoFile,
};
