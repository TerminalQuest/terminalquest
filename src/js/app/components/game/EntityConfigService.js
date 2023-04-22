import * as yup from 'yup';
import TiledService from '../../common/tiled';
import IdleAnimations from './entities/IdleAnimations';

function deepClone(object) {
  return JSON.parse(JSON.stringify(object));
}

/**
 * @typedef {Object} AnimationConfig
 * @property {number[]} frames - Array of frames in the animation, in order.
 * @property {number} frameRate - How many frames should play per second.
 */

/**
 * @typedef {Object} SpriteSheetConfig
 * @property {string} fileName - Relative filepath to the sprite sheet image from the config.json directory.
 * @property {Object} frameDimensions - Data describing the frames in the spritesheet.
 * @property {number} frame.width - Width of each individual frame.
 * @property {number} frame.height - Height of each individual frame.
 */

/**
 * @typedef {Object} SpriteLayerConfig
 * @property {number} frame
 * @property {string} spriteSheet
 * @property {Object} offset
 * @property {number} offset.x
 * @property {number} offset.y
 */

/**
 * Miscellaneous information needed to describe the entity.
 *
 * @typedef {Object} PropertiesConfig
 * @property {Object} sprite - Data required when creating this entity's sprite object.
 * @property {number} sprite.defaultFrameIndex - Initial frame for this sprite.
 * @property {boolean} sprite.useGidAsDefaultFrameIndex - Use the sprite object's id as read from Tiled.
 * @property {string} sprite.spriteSheet - Spritesheet to reference for this sprite.
 * @property {SpriteLayerConfig[]} layers - sprites to be layered over the main sprite
 */

/**
 * @typedef {Object} EntityConfig
 * @property {Object.<string, AnimationConfig>} animations
 * @property {Object.<string, SpriteSheetConfig} spriteSheets
 * @property {PropertiesConfig} properties
 */

/**
 * Singleton instance that tracks all registered {@link EntityConfig}.
 */
class EntityConfigService {
  constructor() {
    this.configs = {};
  }

  // Many of these objects should be re-created as "Tile Objects" in the
  // new workflow.
  isTypeLegacyObject(type) {
    const legacyTypes = [
      'player',
      'npc',
      'interactable',
      'levelChange',
      'triggerArea',
    ];

    return legacyTypes.includes(type);
  }

  validateConfig(config) {
    const configSchema = yup.object().shape({
      animations: yup.object().default({}),
      spriteSheets: yup.object().default({}),
      events: yup.object(),
      state: yup.object(),
      render: yup.mixed().func(),
      properties: yup
        .object()
        .shape({
          sprite: yup
            .object()
            .shape({
              useGidAsDefaultFrameIndex: yup.bool().default(false),
              // defined allows for empty arrays, required does not
              layers: yup.array().default([]),
              spriteSheet: yup.string(),
              defaultFrameIndex: yup.number().default(0),
            })
            .required(),
        })
        .required(),
    });

    /**
     * This function throws Validation errors if the format of the provided
     * input does not match the schema.
     */
    configSchema.validateSync(config);

    return configSchema.cast(config);
  }

  /**
   * @param {string} key
   * @param {EntityConfig} config
   * @throws {ValidationError} - if your config fails to meet the config schema
   * this function will throw an error with detailed information about the
   * failure.
   */
  register(key, config) {
    this.configs[key] = this.validateConfig(config);
  }

  contains(key) {
    return this.configs[key] !== undefined;
  }

  isTileObject(object) {
    return object.gid !== undefined;
  }

  convertFromTileObject(object) {
    // Tiled will include fields map creators didn't touch
    // like name or type. Because they're empty strings,
    // they will not be properly overwritten by defaults
    // if they're not pruned.
    const prunedObject = pruneEmptyStringProperties(object);

    return prunedObject;
  }

  /**
   * @param {string} key
   * @returns {EntityConfigurator} - Configurator object that can perform all necessary config operations.
   */
  get(key) {
    if (!this.contains(key)) {
      console.warn(`There is no registered EntityConfig for: ${key}`);
      return;
    }

    return new EntityConfigurator(this.configs[key]);
  }
}

export default new EntityConfigService();

/**
 * This object has configuration functions necessary to correctly create
 * an entity based on configuration data.
 *
 * This class should only be available if created by the EntityConfigService.
 */
class EntityConfigurator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Creates a sprite based on this entity's config data.
   *
   * @param {Phaser.Game} game
   * @param {Object} spriteConfig - Configuration properties for the SpriteObejct.
   * @returns {Phaser.Sprite}
   */
  createSprite(game, spriteConfig) {
    const {
      useGidAsDefaultFrameIndex,
      defaultFrameIndex,
      spriteSheet,
    } = this.config.properties.sprite;
    const { x, y, gid, height, spriteSheetOverride } = spriteConfig;

    const frame = useGidAsDefaultFrameIndex
      ? TiledService.convertPhaserGidToTiledId(gid)
      : defaultFrameIndex;

    let evaluatedSpriteSheet = spriteSheet;

    // When useGidAsDefaultFrameIndex is set we never want to use a
    // spriteSheetOverride.
    if (useGidAsDefaultFrameIndex && spriteSheetOverride) {
      evaluatedSpriteSheet = spriteSheetOverride;
    }

    // If we didn't find a spritesheet above, try to find it based
    // on the gid.
    if (!evaluatedSpriteSheet) {
      evaluatedSpriteSheet = TiledService.getImageKeyFromGid(gid);
    }

    const sprite = game.add.sprite(x, y - height, evaluatedSpriteSheet, frame);

    if (spriteConfig.width && spriteConfig.height) {
      sprite.width = spriteConfig.width;
      sprite.height = spriteConfig.height;
    }

    return sprite;
  }

  createLayerSprites(game, spriteConfig) {
    const { layers = [] } = this.config.properties.sprite;
    const { x, y, height } = spriteConfig;

    const layerSprites = layers.map(layer => {
      return game.add.sprite(
        x + layer.offset.x,
        y - height + layer.offset.y,
        layer.spriteSheet,
        layer.defaultFrameIndex
      );
    });

    return layerSprites;
  }

  createIdleAnimations(spriteObject) {
    const { idleAnimations } = this.config.properties;

    if (!idleAnimations) {
      return undefined;
    }

    return new IdleAnimations({
      animations: idleAnimations.animations,
      spriteObject,
      minIdleTime: idleAnimations.minIdleTime,
      maxIdleTime: idleAnimations.maxIdleTime,
      shouldCycle: idleAnimations.shouldCycle,
      shouldPickRandomInitialFrame: idleAnimations.shouldPickRandomInitialFrame,
    });
  }

  /**
   * Add all configured animations to the provided sprite object. And all of
   * that sprite object's layerSprites.
   *
   * @param {Phaser.Sprite} sprite
   * @param {Phaser.Sprite[]} layerSprites
   */
  addAnimations(sprite, layerSprites) {
    Object.entries(this.config.animations).forEach(([key, animation]) => {
      if (animation.layer === undefined) {
        sprite.animations.add(key, animation.frames, animation.frameRate);
      } else {
        layerSprites[animation.layer].animations.add(
          key,
          animation.frames,
          animation.frameRate
        );
      }
    });
  }

  /**
   * Load all sprite sheets associated with this Entity.
   *
   * @param {Phaser.Game} game
   * @param {string} entityDirPath - The path where this entity config is located.
   */
  loadSpriteSheets(game, objectDirPath) {
    // TODO: Don't load spritesheets that have already been loaded by a different
    // entity.
    Object.entries(this.config.spriteSheets).forEach(([key, spriteSheet]) => {
      const imagePath = `${objectDirPath}/${spriteSheet.fileName}`;

      if (spriteSheet.type === 'image') {
        game.load.image(key, imagePath);
      } else {
        game.load.spritesheet(
          key,
          imagePath,
          spriteSheet.frameDimensions.width,
          spriteSheet.frameDimensions.height
        );
      }
    });
  }

  getEventHandlers() {
    return this.config && this.config.events ? this.config.events : {};
  }

  getInitialState() {
    return deepClone(this.config && this.config.state ? this.config.state : {});
  }

  getRender() {
    return this.config && this.config.render
      ? this.config.render
      : function() {};
  }
}

function pruneEmptyStringProperties(object) {
  return Object.entries(object).reduce(
    (prunedObject, [currentPropKey, currentPropValue]) => {
      if (currentPropValue === '') {
        return prunedObject;
      }

      return {
        ...prunedObject,
        [currentPropKey]: currentPropValue,
      };
    },
    {}
  );
}
