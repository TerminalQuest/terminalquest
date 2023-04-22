import EventEmitter from 'events';
import audioManager from '../../../common/audio/index';
import { setContext, emitter } from '../../../common/context';
import FSM from './FSM';
import EaseSpriteMovement from './EaseSpriteMovement';
import LensableSet from './LensableSet';
import TiledService from '../../../common/tiled';

class FootStepSounds {
  constructor() {
    this.footStepFileCount = 2;
    this.stepIndex = 0;
    this.cooldownPeriod = 300;
    this.lastStepTimeStamp = 0;
  }

  tryStep() {
    const now = Date.now();

    if (now > this.lastStepTimeStamp + this.cooldownPeriod) {
      // match sfx file format
      const formattedStepIndex = this.stepIndex.toString().padStart(2, '0');

      audioManager.sfx.play(`footstep${formattedStepIndex}`);

      // increment step index, but keep it within number of sfx files
      this.stepIndex = (this.stepIndex + 1) % this.footStepFileCount;

      // track latest played sfx timestamp
      this.lastStepTimeStamp = now;
    }
  }
}

class CollisionSounds {
  constructor() {
    this.collisionFileCount = 5;
    this.playing = false;
  }

  playRandom() {
    const soundFileIndex = Phaser.Math.between(0, this.collisionFileCount - 1);
    const formattedFileIndex = soundFileIndex.toString().padStart(3, '0');

    audioManager.sfx.play(`impactPlank_medium_${formattedFileIndex}`, () => {
      this.playing = false;
    });
    this.playing = true;
  }
}

function isSubset(potentialSubset, set) {
  for (let value of potentialSubset) {
    if (!set.has(value)) {
      return false;
    }
  }

  return true;
}

// Measured in seconds
const INITIAL_COLLISION_SFX_THRESHOLD = 0.3;
const SFX_REPEAT_THRESHOLD = 1;

const isEntityCollisionSfxReady = game => ({ collidedAt, playedAt }) => {
  const hasPassedInitialThreshold =
    game.time.totalElapsedSeconds() - collidedAt >
    INITIAL_COLLISION_SFX_THRESHOLD;

  const isPlayable =
    game.time.totalElapsedSeconds() - playedAt > SFX_REPEAT_THRESHOLD;

  return isPlayable && hasPassedInitialThreshold;
};

export default class Player extends EventEmitter {
  constructor(level, tiledObject) {
    super();

    this.level = level;
    this.game = level.game;
    this.startX = tiledObject.x;
    this.startY = tiledObject.y;
    this.movementDisabled = false;
    this.takingActionDisabled = false;
    this.usingTool = '';
    this.moveSpeed = 120;
    this.facing = 'DOWN';

    // Set up input keys - support arrows and WASD for movement, and
    // spacebar for interaction
    this.keys = {
      up: this.game.input.keyboard.addKey(window.Phaser.Keyboard.UP),
      w: this.game.input.keyboard.addKey(window.Phaser.Keyboard.W),
      left: this.game.input.keyboard.addKey(window.Phaser.Keyboard.LEFT),
      a: this.game.input.keyboard.addKey(window.Phaser.Keyboard.A),
      right: this.game.input.keyboard.addKey(window.Phaser.Keyboard.RIGHT),
      d: this.game.input.keyboard.addKey(window.Phaser.Keyboard.D),
      down: this.game.input.keyboard.addKey(window.Phaser.Keyboard.DOWN),
      s: this.game.input.keyboard.addKey(window.Phaser.Keyboard.S),
      action: this.game.input.keyboard.addKey(window.Phaser.Keyboard.SPACEBAR),
    };

    // Hack to reset keys isDown status in the event a meta key is pressed
    window.addEventListener(
      'keyup',
      event => {
        if (event.code.toLowerCase().includes('meta')) {
          Object.values(this.keys).forEach(key => key.reset());
        }
      },
      false
    );

    // Add Sprite - sprite image must have been added to the cache during a
    // Level's preload - should be done in base class
    this.sprite = this.game.add.sprite(this.startX, this.startY, 'player');
    window.debugSprites.push(this.sprite);

    // set up initial facing of player
    this.sprite.frame = this.directionFrames.DOWN;

    let initialFacing = null;
    if (tiledObject && tiledObject.properties) {
      initialFacing = tiledObject.properties.find(
        property => property.name === 'initialFacing'
      );
    }

    if (initialFacing) {
      const facing = initialFacing.value.toUpperCase();

      if (Object.keys(this.directionFrames).includes(facing)) {
        this.sprite.frame = this.directionFrames[facing];
        this.facing = facing;
      } else {
        console.warning(`Initial player facing "${initialFacing}" is invalid.`);
      }
    }

    // Set up animations
    this.sprite.animations.add('moveDown', [5, 6, 7, 6], 8, true);
    this.sprite.animations.add('moveUp', [21, 22, 23, 22], 8, true);
    this.sprite.animations.add('moveRight', [13, 14, 15, 14], 8, true);
    this.sprite.animations.add('moveLeft', [29, 30, 31, 30], 8, true);
    this.sprite.animations.add('toolLeft', [44], 1, true);
    this.sprite.animations.add('toolRight', [36], 1, true);
    this.sprite.animations.add('toolUp', [40], 1, true);
    this.sprite.animations.add('toolDown', [32], 1, true);
    this.sprite.animations.add('wandLeft', [76, 77, 78], 4);
    this.sprite.animations.add('wandRight', [68, 69, 70], 4);
    this.sprite.animations.add('wandUp', [72, 73, 74], 4);
    this.sprite.animations.add('wandDown', [64, 65, 66], 4);

    // Configure player physics body
    this.game.physics.arcade.enable(this.sprite);
    // this.sprite.body.setCircle(9, 6, 20);
    this.sprite.body.setSize(18, 12, 6, 20);
    this.sprite.body.collideWorldBounds = true;
    this.sprite.body.bounce.setTo(0, 0);

    // Configure player range finder
    this.rangeFinder = new Phaser.Rectangle(0, 0, 8, 8);
    this.alignRangeFinder();
    this.inRangeObject;

    // Set the camera to follow our player
    this.game.camera.follow(
      this.sprite,
      window.Phaser.Camera.FOLLOW_TOPDOWN_TIGHT
    );

    this.footStepSfx = new FootStepSounds();
    this.collisionSfx = new CollisionSounds();
    this.overlappingPoi = new FSM(
      {
        overlapped: {
          actions: {
            notOverlapping: () => this.overlappingPoi.transition('empty'),
          },
          onEnter: () => {
            audioManager.sfx.play(`Pickup_003`);
            this.showExclamationPoint();
          },
        },
        empty: {
          actions: {
            overlapping: () => this.overlappingPoi.transition('overlapped'),
          },
          onEnter: () => {
            this.hideExclamationPoint();
          },
        },
      },
      'empty'
    );

    this.previousCollidingEntities = new LensableSet(value => value.entity);
    this.collidingEntities = new LensableSet(value => value.entity);
    this.collidingState = new FSM(
      {
        noCollisions: {
          actions: {
            reset: () => this.collidingState.transition('pending'),
          },
        },
        pending: {
          actions: {
            collide: entity => {
              const collidedAt = this.previousCollidingEntities.has({ entity })
                ? this.previousCollidingEntities.find({ entity }).collidedAt
                : this.game.time.totalElapsedSeconds();

              const playedAt = this.previousCollidingEntities.has({ entity })
                ? this.previousCollidingEntities.find({ entity }).playedAt
                : 0;

              this.collidingEntities.add({
                collidedAt,
                playedAt,
                entity,
              });
            },
            calculate: () => {
              if (this.collidingEntities.size === 0) {
                this.collidingState.transition('noCollisions');
              } else if (this.collidingEntities.size === 1) {
                this.collidingState.transition('collidingOne');
              } else {
                this.collidingState.transition('collidingMany');
              }
            },
          },
          onEnter: () => {
            this.previousCollidingEntities = this.collidingEntities.clone();
            this.collidingEntities.clear();
          },
        },
        collidingOne: {
          actions: {
            reset: () => this.collidingState.transition('pending'),
          },
        },
        collidingMany: {
          actions: {
            reset: () => this.collidingState.transition('pending'),
          },
        },
      },
      'noCollisions'
    );

    this.createExclamationPoint();

    this.easeSpriteMovement = new EaseSpriteMovement();

    emitter.on(
      'objectUpdate:interactable',
      this.handleInRangeObjectInteractableChange.bind(this)
    );
  }

  onCollision(player, collider) {
    this.collidingState.action('collide', collider);
  }

  // Called every frame update
  update() {
    // Handle area transitions
    this.transitionToArea();

    this.collidingState.action('reset');

    TiledService.getLayers(layer => layer.properties.collision).forEach(
      collisionLayer => {
        // Collide with collision layer marked on tile map
        this.game.physics.arcade.collide(
          this.sprite,
          collisionLayer.instance,
          this.onCollision.bind(this)
        );
      }
    );

    // Collide with sprite group (stuff added to the map that can be collided)
    this.game.physics.arcade.collide(
      this.sprite,
      this.level.entityService.getGroup('objects'),
      this.onCollision.bind(this)
    );

    this.collidingState.action('calculate');

    if (this.collidingState.currentState === 'collidingOne') {
      this.easeSpriteMovement.easeSprite(
        this.sprite,
        // get first (and only) element of set
        this.collidingEntities.values()[0].entity
      );
    }

    const isEntityCollisionSfxReadyWithGame = isEntityCollisionSfxReady(
      this.game
    );

    if (
      (this.collidingState.currentState === 'collidingOne' ||
        this.collidingState.currentState === 'collidingMany') &&
      this.collidingEntities.values().some(isEntityCollisionSfxReadyWithGame)
    ) {
      this.collidingEntities.values().forEach(entity => {
        const isReady = isEntityCollisionSfxReadyWithGame(entity);

        if (isReady) {
          entity.playedAt = this.game.time.totalElapsedSeconds();
        }
      });

      this.collisionSfx.playRandom();
    }

    if (!this.game.paused && !this.usingTool) {
      // Handle player movement
      this.movePlayer();
    }

    // Attempt to process action, if relevant
    if (
      this.keys.action.justDown &&
      !this.game.paused &&
      !this.takingActionDisabled
    ) {
      this.takeAction();
    }

    // Check if any triggers are hit
    this.checkTriggerAreas();

    const newlyInRangeObject = this.getInRangeTarget();

    if (newlyInRangeObject !== this.inRangeObject) {
      // The same object isn't still in range
      this.overlappingPoi.action('notOverlapping');
      this.inRangeObject = undefined;
    }

    if (
      newlyInRangeObject &&
      newlyInRangeObject.hasInteractionEffect &&
      !newlyInRangeObject.hasInteractionEffect()
    ) {
      // if an object has the hasInteractionEffect method,
      // check to see if there IS an interaction effect.
      // if there isn't an interaction effect, we short circuit here.
      return;
    }

    if (newlyInRangeObject) {
      this.inRangeObject = newlyInRangeObject;
      this.overlappingPoi.action('overlapping');
    }
  }

  postUpdate() {
    // Move rangeFinder to player's new position after physics updates occur
    this.alignRangeFinder();

    this.updateExclamationPointLocation();
  }

  directionFrames = {
    LEFT: 24,
    RIGHT: 8,
    UP: 16,
    DOWN: 0,
  };

  // Move based on keyboard input
  movePlayer() {
    if (this.movementDisabled) {
      this.sprite.body.velocity.x = 0;
      this.sprite.body.velocity.y = 0;
      this.sprite.animations.stop();
      return;
    }

    let moveSpeed = {};
    let animating = false;

    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;

    // left and right keyboard movement
    if (this.keys.left.isDown || this.keys.a.isDown) {
      this.facing = 'LEFT';
      this.sprite.animations.play('moveLeft');
      this.sprite.directionFrame = this.directionFrames.LEFT;
      animating = true;
      moveSpeed.x = -this.moveSpeed;
    } else if (this.keys.right.isDown || this.keys.d.isDown) {
      this.facing = 'RIGHT';
      this.sprite.animations.play('moveRight');
      this.sprite.directionFrame = this.directionFrames.RIGHT;
      animating = true;
      moveSpeed.x = this.moveSpeed;
    } else {
      moveSpeed.x = 0;
    }

    // up and down keyboard movement
    if (this.keys.up.isDown || this.keys.w.isDown) {
      if (!animating) {
        this.facing = 'UP';
        this.sprite.animations.play('moveUp');
        this.sprite.directionFrame = this.directionFrames.UP;
      }
      moveSpeed.y = -this.moveSpeed;
    } else if (this.keys.down.isDown || this.keys.s.isDown) {
      if (!animating) {
        this.facing = 'DOWN';
        this.sprite.animations.play('moveDown');
        this.sprite.directionFrame = this.directionFrames.DOWN;
      }
      moveSpeed.y = this.moveSpeed;
    } else {
      moveSpeed.y = 0;
    }

    if (Math.abs(moveSpeed.x) > 0 || Math.abs(moveSpeed.y) > 0) {
      this.sprite.body.velocity.x = moveSpeed.x;
      this.sprite.body.velocity.y = moveSpeed.y;
      this.footStepSfx.tryStep();
    } else {
      this.sprite.animations.stop();
      this.sprite.frame = this.sprite.directionFrame;
    }
  }

  checkTriggerAreas() {
    const triggerAreas = this.level.entityService
      .getCollection('triggerAreas')
      .map(({ instance }) => instance);

    triggerAreas.forEach(triggerArea => {
      if (triggerArea.isInRange(this.sprite.body)) {
        triggerArea.isBeingOverlapped(true);
      } else {
        triggerArea.isBeingOverlapped(false);
      }
    });
  }

  // Check for transition areas and see if we are overlapping
  transitionToArea() {
    const transitions = this.level.entityService
      .getCollection('transitions')
      .map(({ instance }) => instance);
    let foundTransition = null;
    for (let i = 0, l = transitions.length; i < l; i++) {
      let transition = transitions[i];
      if (transition.isInRange(this.rangeFinder)) {
        foundTransition = transition;
        break;
      }
    }

    if (foundTransition) {
      // This may fire multiple times before the level/player is clobbered.
      // Only start the actual level transition once
      if (this.isTransitioning) {
        return;
      }
      this.isTransitioning = true;

      return setContext({
        currentLevel: {
          levelName: foundTransition.levelName,
          playerEntryPoint: foundTransition.playerEntryPoint,
          levelMapName: foundTransition.mapName,
        },
      });
    }
  }

  getInRangeTarget() {
    const foundNpc = this.getInRangeNpc();

    if (foundNpc) {
      return foundNpc;
    }

    const foundObj = this.getInRangeInteractable();

    return foundObj;
  }

  getInRangeNpc() {
    const npcs = this.level.entityService
      .getCollection('npcs')
      .map(({ instance }) => instance);

    let foundNpc = null;

    for (let i = 0, l = npcs.length; i < l; i++) {
      let npc = npcs[i];
      if (npc.isInRange(this.rangeFinder)) {
        foundNpc = npc;
        break;
      }
    }

    return foundNpc;
  }

  handleInRangeObjectInteractableChange(object) {
    if (object === this.inRangeObject && !object.interactable) {
      this.inRangeObject = null;
    }
  }

  getInRangeInteractable() {
    const interactables = this.level.entityService
      .getCollection('interactables')
      .map(({ instance }) => instance);

    let foundObj = null;

    for (let i = 0, l = interactables.length; i < l; i++) {
      let interactable = interactables[i];
      if (interactable.isInRange(this.rangeFinder)) {
        foundObj = interactable;
        break;
      }
    }

    return foundObj;
  }

  // Loop through interactable objects in the game world, and kick off any
  // relevant interactions
  takeAction() {
    const foundNpc = this.getInRangeNpc();

    if (foundNpc) {
      emitter.emit('levelLifecycle', {
        name: 'playerDidInteract',
        target: foundNpc,
      });

      return setContext({ conversationNpc: foundNpc });
    }

    const foundObj = this.getInRangeInteractable();

    if (foundObj) {
      audioManager.sfx.play('metalClick');

      emitter.emit('levelLifecycle', {
        name: 'playerDidInteract',
        target: foundObj,
      });

      if (foundObj.name === 'mission_computer') {
        setContext({ showMissionComputer: true });
        return;
      }

      if (foundObj.interactionEffect) {
        foundObj.interactionEffect();
      }
    }

    if (!foundNpc && !foundObj) {
      audioManager.sfx.play('handleSmallLeather');
    }
  }

  useTool(toolId) {
    this.usingTool = toolId;

    let toolType = 'tool';

    if (toolId === 'wand') {
      toolType = 'wand';
    }

    if (this.sprite.directionFrame === this.directionFrames.LEFT) {
      this.sprite.animations.play(`${toolType}Left`);
    } else if (this.sprite.directionFrame === this.directionFrames.RIGHT) {
      this.sprite.animations.play(`${toolType}Right`);
    } else if (this.sprite.directionFrame === this.directionFrames.DOWN) {
      this.sprite.animations.play(`${toolType}Down`);
    } else if (this.sprite.directionFrame === this.directionFrames.UP) {
      this.sprite.animations.play(`${toolType}Up`);
    }

    emitter.emit('levelLifecycle', {
      name: 'playerUsedTool',
      toolId: toolId,
    });
  }

  stopUsingTool() {
    const prevToolName = this.usingTool;
    this.usingTool = '';

    emitter.emit('levelLifecycle', {
      name: 'playerStoppedUsingTool',
      toolId: prevToolName,
    });
  }

  createExclamationPoint() {
    this.exclamationPoint = this.game.add.sprite(
      this.sprite.x,
      this.sprite.y,
      'exclamation'
    );
    this.exclamationPoint.MAX_SCALE = 0.6;
    this.exclamationPoint.scale.setTo(this.exclamationPoint.MAX_SCALE);
    this.exclamationPoint.anchor.setTo(0.5, 1);
    this.exclamationPoint.visible = false;

    this.exclamationPoint.xOffset = this.sprite.width / 2;
    this.exclamationPoint.yOffset = -4;

    this.level.entityService.registerEntity({
      instance: { sprite: this.exclamationPoint },
      collections: [],
      group: 'ui',
    });
  }

  showExclamationPoint() {
    this.exclamationPoint.visible = true;
    this.exclamationPoint.scale.setTo(0);
    this.game.add
      .tween(this.exclamationPoint.scale)
      .to(
        {
          x: this.exclamationPoint.MAX_SCALE,
          y: this.exclamationPoint.MAX_SCALE,
        },
        150, // time
        Phaser.Easing.Exponential.Out
      )
      .start();
  }

  hideExclamationPoint() {
    const tween = this.game.add.tween(this.exclamationPoint.scale).to(
      {
        x: 0,
        y: 0,
      },
      150, // time
      Phaser.Easing.Exponential.In
    );
    tween.onComplete.add(() => {
      if (this.overlappingPoi.currentState === 'notOverlapping') {
        this.exclamationPoint.visible = false;
      }
    });
    tween.start();
  }

  updateExclamationPointLocation() {
    if (this.exclamationPoint) {
      this.exclamationPoint.x = this.sprite.x + this.exclamationPoint.xOffset;
      this.exclamationPoint.y = this.sprite.y + this.exclamationPoint.yOffset;
    }
  }

  alignRangeFinder() {
    let newX;
    let newY;

    switch (this.facing) {
      case 'LEFT':
        newX = this.sprite.body.x - this.rangeFinder.width / 2;
        newY = this.sprite.body.y + this.sprite.body.height / 2;
        break;
      case 'RIGHT':
        newX =
          this.sprite.body.x +
          this.sprite.body.width +
          this.rangeFinder.width / 2;
        newY = this.sprite.body.y + this.sprite.body.height / 2;
        break;
      case 'UP':
        newX = this.sprite.body.x + this.sprite.body.width / 2;
        newY = this.sprite.body.y - this.rangeFinder.height / 2;
        break;
      case 'DOWN':
        newX = this.sprite.body.x + this.sprite.body.width / 2;
        newY =
          this.sprite.body.y +
          this.sprite.body.height +
          this.rangeFinder.height / 2;
        break;
      default:
        break;
    }

    this.rangeFinder.centerOn(newX, newY);
  }

  // called every render pass
  render() {
    this.sprite.x = Math.floor(this.sprite.x);
    this.sprite.y = Math.floor(this.sprite.y);
  }
}
