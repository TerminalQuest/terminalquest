class EaseSpriteMovement {
  constructor(easeThreshold = { vertical: 8, horizontal: 10 }, easeSpeed = 1) {
    this.easeThreshold = easeThreshold;
    this.easeSpeed = easeSpeed;
  }

  /**
   *
   * There are 8 different octants that can be overlapped.
   *
   *            topLeft      topRight
   *          (0,0) |x|      |x|
   *               -+----------+-
   *    leftTop    x|          |x   rightTop
   *               -|          |-
   *                |  sprite  |
   *               -|          |-
   * leftBottom    x|          |x   rightBottom
   *               -+----------+-
   *                |x|      |x|
   *        bottomLeft      bottomRight
   *
   */
  octants = {
    topLeft: {
      isVertical: false,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.up && spriteBounds.x > colliderBounds.x;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = colliderBounds.bottomRight.x - spriteBounds.topLeft.x;

        if (overlap <= this.easeThreshold.horizontal) {
          return this.easeSpeed;
        }

        return 0;
      },
    },
    topRight: {
      isVertical: false,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.up && spriteBounds.x < colliderBounds.x;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = spriteBounds.topRight.x - colliderBounds.bottomLeft.x;

        if (overlap <= this.easeThreshold.horizontal) {
          return -this.easeSpeed;
        }

        return 0;
      },
    },
    bottomLeft: {
      isVertical: false,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.down && spriteBounds.x > colliderBounds.x;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = colliderBounds.topRight.x - spriteBounds.bottomLeft.x;

        if (overlap <= this.easeThreshold.horizontal) {
          return this.easeSpeed;
        }

        return 0;
      },
    },
    bottomRight: {
      isVertical: false,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.down && spriteBounds.x < colliderBounds.x;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = spriteBounds.bottomRight.x - colliderBounds.topLeft.x;

        if (overlap <= this.easeThreshold.horizontal) {
          return -this.easeSpeed;
        }

        return 0;
      },
    },
    rightTop: {
      isVertical: true,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.right && spriteBounds.y > colliderBounds.y;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = colliderBounds.bottomLeft.y - spriteBounds.topRight.y;

        if (overlap <= this.easeThreshold.vertical) {
          return this.easeSpeed;
        }

        return 0;
      },
    },
    rightBottom: {
      isVertical: true,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.right && spriteBounds.y < colliderBounds.y;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = spriteBounds.bottomRight.y - colliderBounds.topLeft.y;

        if (overlap <= this.easeThreshold.vertical) {
          return -this.easeSpeed;
        }

        return 0;
      },
    },
    leftTop: {
      isVertical: true,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.left && spriteBounds.y > colliderBounds.y;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = colliderBounds.bottomRight.y - spriteBounds.topLeft.y;

        if (overlap <= this.easeThreshold.vertical) {
          return this.easeSpeed;
        }

        return 0;
      },
    },
    leftBottom: {
      isVertical: true,
      isOctant: (touching, spriteBounds, colliderBounds) => {
        return touching.left && spriteBounds.y < colliderBounds.y;
      },
      getAdjustment: (spriteBounds, colliderBounds) => {
        const overlap = spriteBounds.bottomLeft.y - colliderBounds.topRight.y;

        if (overlap <= this.easeThreshold.vertical) {
          return -this.easeSpeed;
        }

        return 0;
      },
    },
  };

  easeSprite(sprite, collider) {
    const spriteBounds = new Phaser.Rectangle(
      sprite.body.x,
      sprite.body.y,
      sprite.body.width,
      sprite.body.height
    );

    let colliderBounds;
    let touching;

    if (collider instanceof Phaser.Sprite) {
      colliderBounds = new Phaser.Rectangle(
        collider.body.x,
        collider.body.y,
        collider.body.width,
        collider.body.height
      );
      touching = sprite.body.touching;
    } else if (collider instanceof Phaser.Tile) {
      colliderBounds = new Phaser.Rectangle(
        collider.worldX,
        collider.worldY,
        collider.width,
        collider.height
      );
      touching = sprite.body.blocked;
    } else {
      console.error('Unsupported collider type!', collider);
      return;
    }

    Object.values(this.octants).forEach(
      ({ isOctant, getAdjustment, isVertical }) => {
        if (isOctant(touching, spriteBounds, colliderBounds)) {
          if (isVertical) {
            sprite.y += getAdjustment(spriteBounds, colliderBounds);
          } else {
            sprite.x += getAdjustment(spriteBounds, colliderBounds);
          }
        }
      }
    );
  }
}

export default EaseSpriteMovement;
