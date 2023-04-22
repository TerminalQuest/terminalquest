import React from 'react';
import cx from 'classnames';
import * as jetpack from 'fs-jetpack';
import path from 'path';
import config from '../../config/config';
import ga from '../../common/analytics';
import { getContext, setContext, emitter } from '../../common/context';
import LevelLifecycleManager from '../../common/levelLifecycleManager';
import DynamicLevel from './DynamicLevel';
import { staticFilePath } from '../../common/fs_utils';
import { prettyLog } from '../../common/utils';
import {
  readDirectory,
  readFile,
  resolveAbsolutePath,
  requireFromExtension,
} from '../../common/assetLoader';
import TiledService from '../../common/tiled';
import EntityConfigService from './EntityConfigService';
import levelLoader from '../../common/levelLoader';
import audioManager from '../../common/audio';

const TRANSITION_DELAY = 750;

// React component which embeds the Phaser game canvas
export default class Game extends React.Component {
  levelLifecycleManager = null;

  constructor(props) {
    super(props);
    this.state = { loading: true };
    this.levelLifecycleManager = new LevelLifecycleManager();

    // Respond to global state changes and possibly pause.
    emitter.on('contextUpdate', this.handleGlobalStateChanges.bind(this));

    // Load new levels when a new one is set globally
    emitter.on('contextUpdate:currentLevel', () => {
      this.loadLevel(getContext('currentLevel'));
    });

    window.warp = (l, e, m) => {
      this.warp(l, e, m);
    };

    window.getPointsOfInterest = (targetLevel = '', targetMap = '') => {
      const pointsOfInterest = levelLoader.getPointsOfInterest(
        targetLevel,
        targetMap
      );

      prettyLog(pointsOfInterest, 'Points Of Interest');
    };
  }

  // Initialize game when container element added to DOM
  componentDidMount() {
    // If default level is loaded before Game, warp immediately.
    // Otherwise wait for event contextUpdate:currentLevel.
    if (getContext('currentLevel')) {
      // Warp to the default level and entry point
      this.loadLevel(getContext('currentLevel'));
    }
  }

  handleGlobalStateChanges() {
    // Check global conditions which must be true for the game to be paused
    const shouldPause = !!(
      getContext('currentMenu') ||
      getContext('conversationNpc') ||
      getContext('showMissionComputer') ||
      getContext('hackObject') ||
      getContext('showOnboarding') ||
      getContext('overlayComponent')
    );

    if (this.level && this.level.game.input) {
      if (shouldPause) {
        this.level.game.input.keyboard.stop();
      } else {
        this.level.game.input.keyboard.start();
      }
    }

    // Pause the game if appropriate
    if (this.level) {
      this.level.game.paused = shouldPause;
    }
  }

  loadLevel(level) {
    // Default level configuration
    let defaultLevelName = config.defaultLevelName;
    let defaultPlayerEntry = config.defaultPlayerEntry;
    let defaultMapName = config.defaultMapName;

    // Override defaults if the prologue mission has not yet been completed
    const levelState = getContext('levelState');
    const prologueState = levelState[config.prologueMissionStateKey] || {};

    const shouldStartPrologue =
      !prologueState.shouldSkipPrologue && !prologueState.missionComplete;

    if (shouldStartPrologue) {
      defaultLevelName = config.defaultLevelNamePrologue;
      defaultPlayerEntry = config.defaultPlayerEntryPrologue;
      defaultMapName = config.defaultMapNamePrologue;
    }

    setTimeout(
      async () => {
        const levelName = level.levelName || defaultLevelName;

        let levelProperties = {};

        // Any async activities involved in initializing a level need to
        // happen here where we can await them.
        //
        // Phaser's set up methods do not support async behaviors.
        const levelInfo = await levelLoader.readLevelInfo(levelName);

        if (levelInfo) {
          levelProperties = levelInfo;
        } else {
          console.error(
            `Level config file cannot be read. Skipping: ${levelName}.`
          );
        }

        // Load default quest status, if necessary
        const questStatus = getContext('questStatus') || {};
        if (!questStatus[levelName]) {
          questStatus[levelName] = {
            title: levelInfo.questTitle || levelInfo.title,
            description: levelInfo.questDescription || levelInfo.description,
          };
        }
        setContext({ questStatus });

        /**
         * Define sequence of levelMapName inheritance
         */
        const levelMapName =
          level.levelMapName || levelProperties.default_map || defaultMapName;

        const mapPath = path.join(
          levelLoader.getMapDirPath(levelName),
          `${levelMapName}.json`
        );

        await TiledService.registerMapFile(mapPath);

        // Load common 32x32 spritesheets
        const spriteSheetFiles = await readDirectory('spritesheets');
        const spriteSheets = (
          await Promise.all(
            spriteSheetFiles.map(async filename => {
              if (filename.indexOf('.png') >= 0) {
                const baseName = `${filename.replace('.png', '')}`;
                const fileUrl = await resolveAbsolutePath(
                  `spritesheets/${filename}`
                );

                return { baseName, fileUrl, height: 32, width: 32 };
              }
            })
          )
        ).filter(spriteSheet => spriteSheet !== undefined);

        // Load common tilesets
        const tilesetFiles = await readDirectory('tilesets');
        const tilesets = (
          await Promise.all(
            tilesetFiles.map(async filename => {
              if (filename.indexOf('.png') >= 0) {
                const baseName = `${filename.replace('.png', '')}`;
                const fileUrl = await resolveAbsolutePath(
                  `tilesets/${filename}`
                );

                // Check if there's a JSON config for this tileset
                let tilesetData;
                const rawTilesetData = await readFile(
                  `tilesets/${baseName}.json`
                );

                if (rawTilesetData) {
                  try {
                    tilesetData = JSON.parse(rawTilesetData);
                  } catch (err) {
                    console.error(
                      `Error occurred while trying to parse JSON tileset data for ${filename}.
                        
                        ${err}`
                    );
                  }
                }

                if (!tilesetData) {
                  // Set default values
                  tilesetData = { tileheight: 24, tilewidth: 24 };
                }

                return {
                  baseName,
                  fileUrl,
                  height: tilesetData.tileheight,
                  width: tilesetData.tilewidth,
                };
              }
            })
          )
        ).filter(tileset => tileset !== undefined);

        // TODO: Deprecate this legacy entity import format once
        // all old entities have been migrated to the new Object
        // config format.
        const commonEntitiesDir = staticFilePath('levels/common/entities');
        const legacyEntityConfigs = jetpack
          .list(commonEntitiesDir)
          .map(entityKey => {
            const entityDirPath = `${commonEntitiesDir}/${entityKey}`;
            if (jetpack.exists(entityDirPath) !== 'dir') {
              console.error(
                `Entity key must be a directory. Skipping: ${entityKey}.`
              );
              return null;
            }

            const configPath = staticFilePath(`${entityDirPath}/config.json`);
            if (jetpack.exists(configPath) !== 'file') {
              console.error(
                `Entity must contain a 'config.json' file. Skipping: ${entityKey}.`
              );
              return null;
            }

            try {
              const config = jetpack.read(configPath, 'json');
              EntityConfigService.register(entityKey, config);

              return {
                key: entityKey,
                dirPath: entityDirPath,
              };
            } catch (error) {
              console.error(
                `Entity 'config.json' cannot be read. Skipping: ${entityKey}.`
              );
              return null;
            }
          })
          .filter(config => config !== null); // filter out null, errored objects

        // load entity configs and spritesheet references
        const objectFiles = await readDirectory('objects');

        // remove hidden files
        const filteredObjectFiles = objectFiles.filter(
          objectKey => objectKey.charAt(0) !== '.'
        );
        const objectConfigs = (
          await Promise.all(
            filteredObjectFiles.map(async objectKey => {
              try {
                const objectDirPath = `objects/${objectKey}`;
                const object = await requireFromExtension(
                  `${objectDirPath}/config.js`
                );

                EntityConfigService.register(objectKey, object);

                const absoluteDirPath = await resolveAbsolutePath(
                  objectDirPath
                );

                return {
                  key: objectKey,
                  dirPath: absoluteDirPath,
                };
              } catch (err) {
                console.error(
                  `Error occurred. Skipping Object: "${objectKey}".
                  
                  ${err.message}
                  `
                );
                return null;
              }
            })
          )
        ).filter(config => config !== null); // filter out null, errored objects

        // Load Audio
        await audioManager.loadLevelAudio(levelName);

        const playerEntryPoint = level.playerEntryPoint || defaultPlayerEntry;
        const previousLevelName = this.level ? this.level.levelName : '';

        // Logic to execute when new level's Phaser objects have been created
        const completionHandler = async () => {
          await this.levelLifecycleManager.setLevel(this.level);

          if (previousLevelName !== levelName) {
            emitter.emit('levelLifecycle', { name: 'levelDidLoad' });
          }

          ga.pageview(`/maps/${levelName}/${levelMapName}`);

          emitter.emit('levelLifecycle', {
            name: 'mapDidLoad',
            mapName: levelMapName,
          });
        };

        if (this.level) {
          if (previousLevelName !== levelName) {
            emitter.emit('levelLifecycle', { name: 'levelWillUnload' });
          }
          this.level.levelName = levelName;
          this.level.playerEntryPoint = playerEntryPoint;
          this.level.levelMapName = levelMapName;
          this.level.levelProperties = levelProperties;
          this.level.spriteSheets = spriteSheets;
          this.level.tilesets = tilesets;
          this.level.objectConfigs = objectConfigs;
          this.level.legacyEntityConfigs = legacyEntityConfigs;
          this.level.onCreationComplete = completionHandler;
          this.level.game.state.restart();
        } else {
          this.level = new DynamicLevel({
            containerId: 'game',
            levelName: levelName,
            playerEntryPoint,
            levelMapName,
            levelProperties,
            spriteSheets,
            tilesets,
            objectConfigs,
            legacyEntityConfigs,
            onCreationComplete: completionHandler,
          });
        }

        // Track level navigation as a pageview
        ga.pageview(`/levels/${levelName}`);

        // Trigger reversing the transition
        setTimeout(() => {
          this.setState({
            loading: false,
          });
          if (this.level) {
            this.level.game.paused = false;
          }
        }, TRANSITION_DELAY);
      },
      this.state.loading ? 0 : TRANSITION_DELAY
    );
    // For the above ^^^ : on first load, we don't need to wait for current level to be "wiped"
    // away with animation (there's no current level), so we can immediately load the new level.
    // This conveniently lines up with when `loading` is true.

    this.setState({ loading: true });

    if (this.level) {
      this.level.game.paused = true;
    }
  }

  warp(levelName, playerEntryPoint, levelMapName) {
    setContext({
      currentLevel: { levelName, playerEntryPoint, levelMapName },
    });
  }

  // Render React component
  render() {
    return (
      <div className="Game">
        <div className={cx('loading', { expanded: this.state.loading })} />
        <div id="game" />
      </div>
    );
  }
}
