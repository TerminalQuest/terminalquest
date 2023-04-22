import merge from 'lodash.merge';
import MapObject from './MapObject';
import EntityConfigService from '../../EntityConfigService';
import OutlineShader from '../../OutlineShader';
import IdleAnimations from '../IdleAnimations';

export default class SpriteObject extends MapObject {
  constructor(level, obj) {
    super(level, obj);

    let configurator;

    if (EntityConfigService.isTypeLegacyObject(obj.type)) {
      // Objects used to use their name property to determine which
      // entity the corresponded to
      configurator = EntityConfigService.get(obj.name);
    } else {
      // Entities overridden as object configs will be using type
      // to key off their config instead of name.
      configurator = EntityConfigService.get(obj.type);
    }

    // TODO: This conditional only needs to exist until all objects have a config file
    if (configurator) {
      this.sprite = configurator.createSprite(this.game, obj);
      this.layerSprites = configurator.createLayerSprites(this.game, obj);

      this.eventHandlers = configurator.getEventHandlers();
      this.state = configurator.getInitialState();
      this.render = configurator.getRender();
    } else {
      // Add Sprite - sprite image must have been added to the cache during a
      // Level's preload
      this.sprite = this.game.add.sprite(this.startX, this.startY, obj.name, 0);
    }

    // Set up physics body
    this.game.physics.arcade.enable(this.sprite);

    if (!this.skipProcessObjectGroupBodies) {
      this.processObjectGroupBody(obj);
    }

    // TODO: This code only needs to exist while some entities do not have configs
    if (configurator) {
      configurator.addAnimations(this.sprite, this.layerSprites);

      this.idleAnimations = configurator.createIdleAnimations(this);

      if (this.idleAnimations) {
        this.idleAnimations.startIdle();
      }
    }

    // Hard code a hook here to add Cedric's animation
    if (this.name === 'cedric') {
      this.sprite.frame = 5; // default frame instead of harcoding zero
      this.sprite.animations.add('blink', [5, 1, 5], 3);
      this.sprite.animations.add('idle', [0, 1, 2, 1, 5], 3);
      this.sprite.animations.add('idle2', [1, 4, 1, 5], 3);
    }

    if (this.orientation === 'vertical') {
      this.orientSpriteVertically();
    }

    if (this.hidden) {
      this.hide();
    }

    if (this.disableBody) {
      this.sprite.body.enable = false;
    }

    this.sprite.zIndex = this.zIndex || 0;

    this.generateSelfAPI = this.generateSelfAPI.bind(this);
  }

  get hidden() {
    return this._hidden;
  }

  set hidden(value) {
    if (value === true) {
      this.hide();
    } else {
      this.show();
    }

    this._hidden = value;
  }

  processObjectGroupBody(obj) {
    if (!obj.objectgroup) {
      return;
    }

    const isCollisionMaskEnabled = obj => {
      const defaultValue = true;
      const { properties = [] } = obj;

      const isCollisionMaskProp = properties.find(
        property => property.name === 'isCollisionMask'
      );

      if (!isCollisionMaskProp) {
        return defaultValue;
      }

      return isCollisionMaskProp.value;
    };

    const collisionBodies = obj.objectgroup.objects.filter(
      isCollisionMaskEnabled
    );

    if (collisionBodies.length === 0) {
      // None of the objects should be treated as collision bodies
      return;
    }

    if (collisionBodies.length > 1) {
      console.warn(
        `Object type ${obj.type} has more than one object in it's object group. Only the first will be used to set the body of this sprite.`
      );
    }

    const [newBody] = collisionBodies;

    /**
     * Scale body should be relative to the parent sprite's scale.
     * https://photonstorm.github.io/phaser-ce/Phaser.Physics.Arcade.Body.html#setSize
     */
    this.sprite.body.setSize(
      newBody.width / this.sprite.scale.x,
      newBody.height / this.sprite.scale.y,
      newBody.x,
      newBody.y
    );
  }

  async playAnimation(
    animationName,
    shouldLoop = false,
    { startingFrame, startWithRandomFrame } = {}
  ) {
    return new Promise(resolve => {
      const animation = this.sprite.animations.play(
        animationName,
        null,
        shouldLoop
      );
      animation.onComplete.add(() => resolve());

      let internalStartingFame = startingFrame;

      if (startWithRandomFrame) {
        internalStartingFame = Phaser.Math.between(0, animation.frameTotal - 1);
      }

      if (internalStartingFame) {
        animation.frame = internalStartingFame;
      }
    });
  }

  _setState(newState) {
    const mergedState = merge({}, this.state, newState);

    this.state = mergedState;
  }

  generateSelfAPI(world) {
    this.setState = newState => {
      this._setState(newState);

      this.render(this.generateSelfAPI(world), world.generateAPI());
    };

    return this;
  }

  destroy() {
    // Idle animation is set to a looping timer that will repeatedly raise a null ref exception
    // after the sprite is destroyed. So we must call the 'stopIdle' method during destruction
    if (this.idleAnimations) {
      this.idleAnimations.stopIdle();
    }

    this.sprite.destroy();

    if (this.layerSprites) {
      this.layerSprites.forEach(layer => layer.destroy());
    }
  }

  hide() {
    if (!this.sprite) {
      return;
    }

    // animate out?
    this.sprite.visible = false;

    if (this.sprite.body) {
      this.sprite.body.enable = false;
    }
  }

  show() {
    if (!this.sprite) {
      return;
    }

    // animate in?
    this.sprite.visible = true;

    if (this.sprite.body && !this.disableBody) {
      this.sprite.body.enable = true;
    }
  }

  orientSpriteVertically() {
    this.sprite.angle = 90;

    // The sprite pivot point causes the sprite to be in the wrong position, we
    // have to manually fix this.
    this.sprite.x += this.sprite.height;

    // Phaser arcade physics bodies cannot rotate. We need to manually transform
    // our sprite's body into the new orientation and location.
    this.sprite.body.setSize(
      this.sprite.height,
      this.sprite.width,
      -this.sprite.height // The same horizontal adjustment we did on the sprite
    );
  }

  showOutline() {
    this.outlineShader = new OutlineShader(this.game);
    this.outlineShader.setColor(0xfffab0);
    this.outlineShader.setSprite(this.sprite);

    this.sprite.filters = [this.outlineShader];
  }

  hideOutline() {
    if (!this.outlineShader) {
      return;
    }

    this.outlineShader.destroy();
    this.outlineShader = undefined;
    this.sprite.filters = null;
  }

  createIdleAnimations(idleAnimationConfig) {
    if (this.idleAnimations) {
      // If we already have an idle animation, stop it so we can replace it
      this.idleAnimations.stopIdle();
    }

    this.idleAnimations = new IdleAnimations({
      ...idleAnimationConfig,
      spriteObject: this,
    });

    this.idleAnimations.startIdle();
  }

  // Determine if the sprite for this object is in range of another
  isInRange(testSprite) {
    let testBounds, spriteBounds;

    if (testSprite instanceof Phaser.Sprite) {
      testBounds = test.getBounds();
    } else if (testSprite instanceof Phaser.Rectangle) {
      testBounds = testSprite;
    } else {
      console.warn('Invalid type of testSprite!');
    }

    if (this.sprite.body) {
      spriteBounds = new Phaser.Rectangle(
        this.sprite.body.position.x,
        this.sprite.body.position.y,
        this.sprite.body.width,
        this.sprite.body.height
      );
    } else {
      spriteBounds = new Phaser.Rectangle(
        this.sprite.position.x,
        this.sprite.position.y,
        this.sprite.width,
        this.sprite.height
      );
    }

    const intersects = Phaser.Rectangle.intersects(testBounds, spriteBounds);
    return intersects;
  }
}
