import levelLoader from './levelLoader';
import audioManager from './audio';
import { setContext, getContext, emitter } from './context';
import { staticFilePath } from './fs_utils';
import TiledService from './tiled';
import { requireFromExtension } from './assetLoader';
import analytics from './analytics';

function resolveFilterFn(keyOrFilter) {
  if (typeof keyOrFilter === 'string') {
    // assume this is a key
    return entity => entity.instance.key === keyOrFilter;
  }

  return keyOrFilter;
}

function getCameraPosition(camera) {
  return {
    x: camera.centerX,
    y: camera.centerY,
  };
}

class World {
  constructor(level) {
    this.level = level;
  }

  generateAPI(shouldIncludeBundledAPI = false) {
    const worldAPI = {
      getState: this.getState,
      setState: this.setState,
      startConversation: this.startConversation,
      showEntities: this.showEntities,
      hideEntities: this.hideEntities,
      destroyEntities: this.destroyEntities,
      forEachEntities: this.forEachEntities,
      showNotification: this.showNotification,
      scheduleTimerEvent: this.scheduleTimerEvent,
      removeObjective: this.removeObjective,
      entityService: this.level.entityService,
      getContext,
      setContext,
      emitter,
      levelLoader,
      levelsDirectoryPath: staticFilePath('levels'),
      screenShake: this.screenShake,
      enableTransitionAreas: this.enableTransitionAreas,
      disableTransitionAreas: this.disableTransitionAreas,
      isObjectiveCompleted: this.isObjectiveCompleted,
      isLevelCompleted: this.isLevelCompleted,
      getCurrentMapName: this.getCurrentMapName,
      getCurrentLevelName: this.getCurrentLevelName,
      showOverlayComponent: this.showOverlayComponent,
      __internals: {
        level: this.level,
        TiledService,
      },
      disablePlayerMovement: this.disablePlayerMovement,
      enablePlayerMovement: this.enablePlayerMovement,
      useTool: this.useTool,
      stopUsingTool: this.stopUsingTool,
      tweenCameraToPosition: this.tweenCameraToPosition,
      tweenCameraToPlayer: this.tweenCameraToPlayer,
      wait: this.wait,
      updateQuestStatus: this.updateQuestStatus,
      playBackgroundMusic: this.playBackgroundMusic,
      warp: this.warp,
      grantItems: this.grantItems,
      removeItems: this.removeItems,
    };

    /**
     * Bundled scripts (those that have been authored
     * by the devs) have access to additional APIs. These
     * are features we don't want external authors using,
     * like our analytics accounts.
     *
     * Nothing sensitive should be included here though.
     * A malicious actor could access any of the code we ship
     * since we ship in JS to their desktop!
     *
     * This should be thought of as a reasonable
     * precaution to keep the curious among external
     * authors from running into these APIs.
     */
    if (shouldIncludeBundledAPI) {
      worldAPI.analytics = analytics;
    }

    return worldAPI;
  }

  getState = key => {
    return getContext('levelState')[key];
  };

  setState = (key, value) => {
    setContext({ levelState: { ...getContext('levelState'), [key]: value } });
  };

  playBackgroundMusic = trackName => {
    if (!audioManager.music.currentlyPlayingTracks.includes(trackName)) {
      audioManager.music.fadeOutAll();
      audioManager.music.play(trackName);
    }
  };

  // Update the persistent quest status for the current level
  updateQuestStatus = (levelName, title, description, complete = false) => {
    const questStatus = getContext('questStatus');

    questStatus[levelName] = {
      title,
      description,
      complete,
    };

    setContext({ questStatus });
  };

  startConversation = (conversation, name, timeout = 0) => {
    window.setTimeout(() => {
      setContext({
        conversationNpc: {
          conversation,
          name,
          level: this.level,
        },
      });
    }, timeout);
  };

  showEntities = (keyOrFilter, timeout = 0) => {
    window.setTimeout(() => {
      this.level.entityService
        .getAll(resolveFilterFn(keyOrFilter))
        .map(({ instance }) => instance)
        .forEach(entity => entity.show());
    }, timeout);
  };

  hideEntities = (keyOrFilter, timeout = 0) => {
    window.setTimeout(() => {
      this.level.entityService
        .getAll(resolveFilterFn(keyOrFilter))
        .map(({ instance }) => instance)
        .forEach(entity => entity.hide());
    }, timeout);
  };

  destroyEntities = (keyOrFilter, timeout = 0) => {
    window.setTimeout(() => {
      this.level.entityService.destroyAll(resolveFilterFn(keyOrFilter));
    }, timeout);
  };

  forEachEntities = (keyOrFilter, forEach, timeout) => {
    const invoke = () => {
      this.level.entityService
        .getAll(resolveFilterFn(keyOrFilter))
        .map(({ instance }) => instance)
        .forEach(forEach);
    };

    if (timeout) {
      window.setTimeout(invoke, timeout);
    }

    invoke();
  };

  showNotification = (toastMessage, timeout = 0) => {
    window.setTimeout(() => {
      setContext({ toastMessage });
    }, timeout);
  };

  scheduleTimerEvent = (payload, timeout) => {
    window.setTimeout(() => {
      emitter.emit('levelLifecycle', {
        ...payload,
        name: 'timerDidTrigger',
      });
    }, timeout);
  };

  removeObjective = (missionName, objectiveName) => {
    const completedObjectives = {
      ...getContext('completedObjectives'),
    };
    delete completedObjectives[`${missionName}.${objectiveName}`];
    setContext({ completedObjectives });
  };

  screenShake = (amount, timeout = 0) => {
    window.setTimeout(() => {
      this.level.game.plugins.screenShake.shake(amount);
    }, timeout);
  };

  enableTransitionAreas = (keyOrFilter, timeout = 0) => {
    window.setTimeout(() => {
      this.level.entityService
        .getAll(resolveFilterFn(keyOrFilter))
        .map(({ instance }) => instance)
        .forEach(entity => {
          entity.disabled = false;
        });
    }, timeout);
  };

  disableTransitionAreas = (keyOrFilter, timeout = 0) => {
    window.setTimeout(() => {
      this.level.entityService
        .getAll(resolveFilterFn(keyOrFilter))
        .map(({ instance }) => instance)
        .forEach(entity => {
          entity.disabled = true;
        });
    }, timeout);
  };

  isObjectiveCompleted = (objective, mission) => {
    if (!mission) {
      // use current mission by default
      mission = getContext('currentLevel').levelName;
    }

    return Boolean(
      getContext('completedObjectives')[`${mission}.${objective}`]
    );
  };

  isLevelCompleted = async level => {
    if (!level) {
      level = this.getCurrentLevelName();
    }

    const levelInfo = await levelLoader.readLevelInfo(level);

    return levelInfo.objectiveManifest.every(objectiveKey =>
      this.isObjectiveCompleted(objectiveKey, level)
    );
  };

  getCurrentMapName = () => {
    return getContext('currentLevel').levelMapName;
  };

  getCurrentLevelName = () => {
    return getContext('currentLevel').levelName;
  };

  disablePlayerMovement = ({
    disablePlayerMovement = true,
    disablePlayerAction = true,
  } = {}) => {
    this.level.player.movementDisabled = disablePlayerMovement;
    this.level.player.takingActionDisabled = disablePlayerAction;
  };

  enablePlayerMovement = ({
    enablePlayerMovement = true,
    enablePlayerAction = true,
  } = {}) => {
    this.level.player.movementDisabled = !enablePlayerMovement;
    this.level.player.takingActionDisabled = !enablePlayerAction;
  };

  useTool = toolId => {
    this.level.player.useTool(toolId);
  };

  stopUsingTool = () => {
    this.level.player.stopUsingTool();
  };

  wait = (timeout = 0) => {
    return new Promise(resolve => {
      setTimeout(resolve, timeout);
    });
  };

  tweenCameraToPosition = (
    position = { x: 0, y: 0 },
    { duration = 750, easing = Phaser.Easing.Exponential.InOut } = {}
  ) => {
    return new Promise(resolve => {
      const { game } = this.level;
      const { camera } = game;

      const cameraPosition = getCameraPosition(camera);

      // Make sure we aren't following anything any more
      camera.unfollow();

      const tween = game.add
        .tween(cameraPosition)
        .to(position, duration, easing);

      tween.onUpdateCallback(() => {
        camera.focusOnXY(cameraPosition.x, cameraPosition.y);
      });

      tween.onComplete.add(resolve);

      tween.start();
    });
  };

  tweenCameraToPlayer = async tweenOptions => {
    const { game, player } = this.level;

    await this.tweenCameraToPosition(
      {
        x: player.sprite.x,
        y: player.sprite.y,
      },
      tweenOptions
    );

    game.camera.follow(player.sprite);
  };

  showOverlayComponent = async (overlayComponent, timeout = 0) => {
    window.setTimeout(() => {
      setContext({ overlayComponent });
    }, timeout);
  };

  warp = (levelName, playerEntryPoint, levelMapName) => {
    setContext({
      currentLevel: { levelName, playerEntryPoint, levelMapName },
    });
  };

  grantItems = (grantedItems = []) => {
    const inventory = getContext('inventory');
    const newItems = grantedItems.filter(
      grantedItem => !inventory.includes(grantedItem)
    );

    setContext({ inventory: [...inventory, ...newItems] });
  };

  removeItems = (removedItems = []) => {
    const inventory = getContext('inventory');
    const newInventory = inventory.filter(item => !removedItems.includes(item));

    setContext({ inventory: newInventory });
  };
}

export default World;
