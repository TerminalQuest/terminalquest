const jetpack = require('fs-jetpack');
const path = require('path');

const LEVEL_DIR_NAME = 'levels';
const LEVELS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'public',
  LEVEL_DIR_NAME
);
const LEVEL_FILE_NAME = 'level.json';

function isMission(levelInfo) {
  return levelInfo.is_mission;
}

function isValidLevel(levelDir, levelInfoPath) {
  return jetpack.exists(levelDir) === 'dir' && jetpack.exists(levelInfoPath);
}

async function readLevelInfoFile(levelName) {
  const levelDir = path.join(LEVELS_DIR, levelName);
  const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

  return JSON.parse(await jetpack.read(levelInfoPath));
}

async function writeLevelInfoFile(levelName, levelInfo) {
  const levelDir = path.join(LEVELS_DIR, levelName);
  const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

  const levelInfoString = JSON.stringify(levelInfo, undefined, 2) + '\n';
  return jetpack.writeAsync(levelInfoPath, levelInfoString);
}

async function getMissionInfo(missionDir, missionFolder) {
  const levelInfo = {};

  // Add info necessary to launch/load levels
  levelInfo.icon = path.join(LEVELS_DIR, missionFolder, 'mission_icon.png');
  levelInfo.xp = 0;
  levelInfo.objectives = [];

  const objectivesDirPath = path.join(missionDir, 'objectives');
  const folderNames = await jetpack.list(objectivesDirPath);
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
      mapNameList.map(async mapName => {
        const mapPath = path.join(mapsDirPath, mapName);
        const mapInfo = {
          mapName: path.parse(mapName).name,
          data: JSON.parse(await jetpack.read(mapPath)),
        };

        return mapInfo;
      })
    );

    levelInfo.maps = maps;
  }

  return levelInfo;
}

async function readLevels() {
  const levelsDirContents = await jetpack.listAsync(LEVELS_DIR);

  const levelFolders = levelsDirContents.filter(folder => {
    const levelDir = path.join(LEVELS_DIR, folder);
    const levelInfoPath = path.join(levelDir, LEVEL_FILE_NAME);

    return isValidLevel(levelDir, levelInfoPath);
  });

  const levels = await Promise.all(
    levelFolders.map(async folder => {
      const levelDir = path.join(LEVELS_DIR, folder);

      let levelInfo = await readLevelInfoFile(folder);
      levelInfo.levelName = folder;

      if (isMission(levelInfo)) {
        const missionInfo = await getMissionInfo(levelDir, folder);

        levelInfo = Object.assign(levelInfo, missionInfo);
      }

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
  LEVELS_DIR,
};
