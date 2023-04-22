import path from 'path';
import * as jetpack from 'fs-jetpack';
import * as yup from 'yup';
import { staticFilePath, staticFileUrl } from './fs_utils';
import db from './database';
import config from '../config/config';
import { getContext } from './context';
import {
  readFile,
  readDirectory,
  resolveAbsolutePath,
  doesPathExist,
  isPathFromBundledExtension,
} from './assetLoader';
import extendYup from './extendYup';
import { reduceEntries } from './utils';

const LEVEL_DIR_NAME = 'levels';
const LEVEL_FILE_NAME = 'level.json';
const OBJECTIVE_FILE_NAME = 'objective.json';
const EVENTS_FILE_NAME = 'events.js';
const MAPS_DIR_NAME = 'maps';

/**
 * Because this file is a singleton, we need to ensure that our yup
 * prototype is extended before we construct the schema in this file.
 *
 * The global extendYup call is not guaranteed to have already been
 * called when this module is imported.
 */
extendYup();

class LevelLoader {
  constructor() {
    this.levels = [];
    this.levelsDir = staticFilePath(LEVEL_DIR_NAME);
    this.levelConfigSchema = yup.object().shape({
      title: yup.string().required(),
      description: yup.string(),
      is_mission: yup.boolean().default(false),
      prereqs: yup.array().of(yup.string()),
      flavorTextOverrides: yup.object().nullable(),
      backgroundMusic: yup.string(),
      backgroundEffect: yup
        .object()
        .shape({
          key: yup.string(),
          options: yup.object(),
        })
        .nullable(),
    });
  }

  async importLevels() {
    const levelFileNames = await readDirectory(LEVEL_DIR_NAME);

    if (levelFileNames === undefined) {
      console.error(
        `The levels directory "${LEVEL_DIR_NAME}" was not defined in any extensions (base or otherwise).`
      );
      return;
    }

    this.levels = await Promise.all(
      levelFileNames.map(async levelFileName => {
        if (levelFileName === '.DS_Store') {
          return;
        }

        if (await this.isValidLevel(levelFileName)) {
          return await this.readLevelInfo(levelFileName);
        }
      })
    );

    this.levels = this.levels.filter(level => level !== undefined);

    this.levels.sort(compareLevels);
  }

  getLevel(levelName) {
    return this.levels.find(level => level.levelName === levelName);
  }

  getInitialMission() {
    const levelState = getContext('levelState');
    const prologueState = levelState[config.prologueMissionStateKey] || {};
    let { defaultLevelName } = config;

    const shouldStartPrologue =
      !prologueState.shouldSkipPrologue && !prologueState.missionComplete;

    if (shouldStartPrologue) {
      defaultLevelName = config.defaultLevelNamePrologue;
    }

    const initialMission = this.levels.find(
      level => level.levelName === defaultLevelName
    );

    return initialMission;
  }

  getMissions() {
    return this.levels.filter(isMission);
  }

  getDestinations() {
    return this.levels.filter(isDestination);
  }

  getMaps() {
    return this.levels.reduce(
      (object, nextLevel) => [...object, ...Object.entries(nextLevel.maps)],
      []
    );
  }

  /**
   * Collects all of the playerEntryPoints for a given level and map, returning them with convenience information
   * appended to each entry.
   * @param {string} levelName - The level to target when collecting warpCommands by playerEntryPoints.
   * @param {string} mapName - The map to target when collecting warpCommands by playerEntryPoints.
   * @returns An array of playerEntryPoints belonging to the target level -> map.
   */
  getPlayerEntryPoints(levelName, mapName) {
    const level = this.getLevel(levelName);
    const map = level.maps[mapName];

    // Filters out layers that don't have an 'objects' property,
    // reduces the remaining layers down to their 'objects' property,
    // filters out objects that aren't of the 'player' type,
    // appends 'mapName' and 'levelName' to each object for convenience
    const playerEntryPoints = map.layers
      .filter(layer => layer.objects)
      .reduce((array, layer) => [...array, ...layer.objects], [])
      .filter(object => object.type === 'player')
      .map(entryPoint => ({
        ...entryPoint,
        levelName,
        mapName,
        warpCommand: `warp('${levelName}', '${entryPoint.name}', '${mapName}');`,
      }));

    return playerEntryPoints;
  }

  /**
   * Goes through all playerEntryPoints in a map and returns the fully qualified warp command for them.
   * @param {string} levelName - The level to target when collecting warpCommands by playerEntryPoints.
   * @param {string} mapName - The map to target when collecting warpCommands by playerEntryPoints.
   * @returns An object that follows this structure: entryPointName -> warpCommand
   */
  getWarpCommandsByPlayerEntryPoints(levelName, mapName) {
    const warpCommands = this.getPlayerEntryPoints(levelName, mapName).reduce(
      (object, nextEntryPoint) => ({
        ...object,
        [nextEntryPoint.name]: nextEntryPoint.warpCommand,
      }),
      {}
    );

    return warpCommands;
  }

  getMapDirPath(levelName) {
    return path.join(LEVEL_DIR_NAME, levelName, 'maps');
  }

  getObjectivesDirPath(levelName) {
    return path.join(LEVEL_DIR_NAME, levelName, 'objectives');
  }

  getEventsModulePath(levelName) {
    return path.join(LEVEL_DIR_NAME, levelName, EVENTS_FILE_NAME);
  }

  async isEventsModuleBundled(levelName) {
    const relativeEventsModulePath = this.getEventsModulePath(levelName);
    const absoluteEventsModulePath = await resolveAbsolutePath(
      relativeEventsModulePath
    );

    return isPathFromBundledExtension(absoluteEventsModulePath);
  }

  getConversationsDir(levelName) {
    return path.join(LEVEL_DIR_NAME, levelName, 'conversations');
  }

  getConversationsVoiceOverDir(levelName) {
    return path.join(this.getConversationsDir(levelName), 'vo');
  }

  async getFullMissionData(mission) {
    const missionName = mission.levelName;
    const completedObjectives = getContext('completedObjectives');

    const objectives = await this.populateObjectives(
      missionName,
      mission.objectiveManifest
    );

    const doesObjectiveHaveXpReward = objective =>
      objective.rewards && objective.rewards.xp;
    const isObjectiveCompleted = objective =>
      completedObjectives[`${missionName}.${objective.objectiveName}`];

    mission.completedXP = objectives.reduce((currentTotalXp, objective) => {
      if (
        doesObjectiveHaveXpReward(objective) &&
        isObjectiveCompleted(objective)
      ) {
        return currentTotalXp + objective.rewards.xp;
      }

      return currentTotalXp;
    }, 0);

    // default to no prereqs
    mission.prereqList = [];

    if (mission.prereqs) {
      // if mission has prereqs, look them up
      mission.prereqList = await Promise.all(
        mission.prereqs.map(async prereqId => {
          const prereqInfo = prereqId.split('.');
          const objectiveInfo = await this.readObjectiveInfo(
            prereqInfo[0],
            prereqInfo[1]
          );
          return { key: prereqId, title: objectiveInfo.title };
        })
      );
    }

    return mission;
  }

  async getFullMissionList() {
    const missions = this.getMissions();
    const newMissionList = [];

    // Loop through completed objectives for each mission
    await Promise.all(
      missions.map(async mission => {
        const newMissionData = await this.getFullMissionData(mission);
        newMissionList.push(newMissionData);
      })
    );

    return newMissionList;
  }

  async getFullDestinationList() {
    const missions = this.getDestinations();
    const destinationList = [];

    // Loop through completed objectives for each mission
    await Promise.all(
      missions.map(async mission => {
        const newMissionData = await this.getFullMissionData(mission, true);
        destinationList.push(newMissionData);
      })
    );

    return destinationList;
  }

  // MIGRATION(nirav) 02_objectives_in_context
  async getCompletedObjectiveMap() {
    const completed = await db.completedObjectives.toArray();
    return completed.reduce((map, objective) => {
      map[`${objective.missionName}.${objective.objectiveName}`] = objective;
      return map;
    }, {});
  }

  /**
   * Searches through all maps for an objective, based on it's name.
   * @param {string} objectiveName - The name of an objective.
   * @returns A map which owns an objective that shares the same name as the objectiveName argument.
   */
  getObjectiveMap(objectiveName) {
    const maps = this.getMaps();

    // Checks for a layer that has the objects property, which includes an object witha property named 'properties', and a property called
    // 'objectiveName' that is equal to the objectiveName argument
    for (let i = 0; i < maps.length; i++) {
      const [mapName, map] = maps[i];

      const searchResult = map.layers.find(
        layer =>
          layer.objects &&
          layer.objects.find(
            object =>
              object.properties &&
              object.properties.find(
                property =>
                  property.name === 'objectiveName' &&
                  property.value === objectiveName
              )
          )
      );

      if (searchResult) {
        return { ...map, name: mapName };
      }
    }

    return {};
  }

  // MIGRATION(nirav) 201911_xp_in_context
  async getCurrentPlayerXp() {
    const completedObjectives = getContext('completedObjectives');
    let playerXP = 0;

    if (this.levels.length === 0) {
      console.warn(
        'No levels have been loaded into levelLoader. Returning default 0 xp.'
      );
    }

    this.levels.forEach(level => {
      if (!isMission(level)) {
        return;
      }

      level.objectives.forEach(objective => {
        if (
          completedObjectives[`${level.levelName}.${objective.objectiveName}`]
        ) {
          playerXP += objective.rewards.xp;
        }
      });
    });

    return playerXP;
  }

  async getMissionInfo(levelInfo) {
    const missionInfo = {};

    if (levelInfo.mission_icon) {
      const missionIconPath = path.join('images', levelInfo.mission_icon);
      missionInfo.icon = await resolveAbsolutePath(missionIconPath);
    } else {
      // use default mission icon
      const missionIconPath = path.join('images', 'mission_icon.png');
      missionInfo.icon = await resolveAbsolutePath(missionIconPath);
    }

    // Allow configuration of custom nav map sprite
    if (levelInfo.navMap) {
      const defaultMapSprite = path.join('images', 'default_planet_sprite.png');
      let mapSpritePath = await resolveAbsolutePath(defaultMapSprite);

      if (levelInfo.navMap.sprite) {
        const navMapSprite = path.join('images', levelInfo.navMap.sprite);
        const navMapSpriteAbsPath = await resolveAbsolutePath(navMapSprite);
        if (navMapSpriteAbsPath) {
          mapSpritePath = navMapSpriteAbsPath;
        }
      }

      levelInfo.navMap.spritePath = mapSpritePath;
    }

    missionInfo.objectives = [];
    const { objectives = [] } = levelInfo;
    const missionName = levelInfo.levelName;

    // Save the objective names as a manifest
    missionInfo.objectiveManifest = objectives;
    missionInfo.objectives = await this.populateObjectives(
      missionName,
      objectives
    );

    missionInfo.xp = missionInfo.objectives.reduce((totalXp, objective) => {
      if (objective.rewards && objective.rewards.xp) {
        return totalXp + objective.rewards.xp;
      }

      return totalXp;
    }, 0);

    missionInfo.maps = await this.populateMaps(missionName);

    return missionInfo;
  }

  /**
   * Gets commonly-searched-for information for all levels/maps.
   * @param {string} filterLevel - The level to target when listing points of interest.
   * @param {string} filterMap - The map to target whe listing points of interest.
   * @returns An object structured by levelNames, maps, and/or objectives, that contains commonly-searched-for information.
   */
  getPointsOfInterest(filterLevel = '', filterMap = '') {
    const structuredPointsOfInterest = {};

    const shouldFilterLevel = levelName =>
      filterLevel !== '' && levelName !== filterLevel;
    const shouldFilterMap = mapName =>
      filterMap !== '' && mapName !== filterMap;

    // Consolidates all playerEntryPoints and objectives into 'structuredPointsOfInterest'
    // with intermediate levels, maps, and labels included as object wrappers
    for (let [, level] of this.levels.entries()) {
      const levelName = level.levelName;

      if (shouldFilterLevel(levelName)) continue;

      // An object that houses all of the playerEntryPoints, with map names used as mechanisms for grouping
      const structuredWarpCommands = Object.getOwnPropertyNames(level.maps)
        .filter(nextMapName => !shouldFilterMap(nextMapName))
        .reduce((object, nextMapName) => {
          const structuredWarpCommandKey = nextMapName;
          const warpCommandsByPlayerEntryPoint = this.getWarpCommandsByPlayerEntryPoints(
            levelName,
            nextMapName
          );

          return {
            ...object,
            [structuredWarpCommandKey]: warpCommandsByPlayerEntryPoint,
          };
        }, {});

      // An object that houses all of the objectives, with objective names used as machanisms for grouping
      const structuredObjectives = level.objectives
        // Appending the owning map's name to each objective for use later in the chain
        .map(objective => ({
          ...objective,
          mapName: this.getObjectiveMap(objective.objectiveName).name,
        }))
        .filter(objective => !shouldFilterMap(objective.mapName))
        .reduce((object, nextObjective) => {
          const structuredObjectiveKey = `${nextObjective.title} (${nextObjective.objectiveName})`;
          const structuredObjective = {
            description: nextObjective.description,
            warpCommand: `warp('${levelName}', 'player_entry1', '${nextObjective.mapName}');`,
          };

          return { ...object, [structuredObjectiveKey]: structuredObjective };
        }, {});

      structuredPointsOfInterest[levelName] = {};

      // playerEntryPoints and objectives aren't added if they're empty, to reduce clutter
      if (Object.getOwnPropertyNames(structuredWarpCommands).length > 0)
        structuredPointsOfInterest[
          levelName
        ].playerEntryPoints = structuredWarpCommands;

      if (Object.getOwnPropertyNames(structuredObjectives).length > 0)
        structuredPointsOfInterest[levelName].objectives = structuredObjectives;
    }

    return structuredPointsOfInterest;
  }

  async populateMaps(missionName) {
    const missionMapsPath = path.join(
      LEVEL_DIR_NAME,
      missionName,
      MAPS_DIR_NAME
    );
    const mapFileNames = await readDirectory(missionMapsPath);

    if (mapFileNames === undefined) {
      // This level has no maps
      return {};
    }

    const readMapPromises = mapFileNames
      .filter(mapFileName => {
        const extName = path.extname(mapFileName);

        return extName === '.json';
      })
      .map(async mapFileName => {
        const mapPath = path.join(missionMapsPath, mapFileName);
        const mapJson = await readFile(mapPath);
        const mapKey = path.basename(mapFileName, '.json');
        const mapData = JSON.parse(mapJson);
        const mapEntry = [mapKey, mapData];

        return mapEntry;
      });

    const mapEntries = await Promise.all(readMapPromises);
    const maps = reduceEntries(mapEntries);

    return maps;
  }

  async populateObjectives(missionName, objectiveManifest) {
    return await Promise.all(
      objectiveManifest.map(objectiveDir =>
        this.readObjectiveInfo(missionName, objectiveDir)
      )
    );
  }

  async isValidLevel(levelDirName) {
    try {
      const rootLevelPath = path.join(LEVEL_DIR_NAME, levelDirName);

      if (!(await doesPathExist(rootLevelPath))) {
        throw new Error(`The level "${levelDirName}" does not exist.`);
      }

      const configPath = path.join(rootLevelPath, LEVEL_FILE_NAME);
      const fileContents = await readFile(configPath);

      if (!fileContents) {
        throw new Error(
          `The level "${levelDirName}" does not have a config file.`
        );
      }

      const config = JSON.parse(fileContents);

      /**
       * This function throws Validation errors if the format of the provided
       * input does not match the schema.
       */

      this.levelConfigSchema.validateSync(config);
    } catch (err) {
      console.error(err);

      return false;
    }

    return true;
  }

  async readLevelInfo(levelDirName) {
    const levelPath = path.join(LEVEL_DIR_NAME, levelDirName, LEVEL_FILE_NAME);
    const fileContents = await readFile(levelPath);

    if (!fileContents) {
      throw new Error(
        `The level "${levelDirName}" does not have an config file.`
      );
    }

    let levelInfo = JSON.parse(fileContents);
    levelInfo.levelName = levelDirName;

    const missionInfo = await this.getMissionInfo(levelInfo);
    levelInfo = Object.assign(levelInfo, missionInfo);

    return levelInfo;
  }

  async readObjectiveInfo(currentMissionName, objectiveDir) {
    let objectiveName = objectiveDir;

    if (objectiveDir.includes('/')) {
      [, objectiveName] = objectiveDir.split('/');
      console.warn(
        `Objectives are bound to the level they're located within. Treating "${objectiveDir}" as "${objectiveName}" from "${currentMissionName}"`
      );
    }

    const objectivePath = path.join(
      this.getObjectivesDirPath(currentMissionName),
      objectiveName,
      OBJECTIVE_FILE_NAME
    );

    const fileContents = await readFile(objectivePath);
    if (!fileContents) {
      throw new Error(
        `The objective "${objectiveName}" does not have an ${OBJECTIVE_FILE_NAME} file.`
      );
    }

    const objectiveInfo = JSON.parse(fileContents);
    objectiveInfo.objectiveName = objectiveName;

    return objectiveInfo;
  }
}

function isMission(levelInfo) {
  return levelInfo.is_mission;
}

function isDestination(levelInfo) {
  return Boolean(levelInfo.navMap);
}

function compareLevels(a, b) {
  // Fallback - sort by alphabet
  function alpha() {
    if (a.title < b.title) {
      return -1;
    }
    if (a.title > b.title) {
      return 1;
    }
    return 0;
  }

  if (a.priority && b.priority) {
    // Sort by priority
    let s = a.priority - b.priority;
    if (s === 0) {
      // If priority is equal alphabetize
      return alpha();
    } else {
      return s;
    }
  } else if (a.priority && !b.priority) {
    // A has a priority
    return -1;
  } else if (!a.priority && b.priority) {
    // B has a priority
    return 1;
  } else {
    // If no priority, just sort by alpha
    return alpha();
  }
}

export default new LevelLoader();
export { OBJECTIVE_FILE_NAME };
