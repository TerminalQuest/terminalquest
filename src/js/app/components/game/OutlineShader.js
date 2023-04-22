function convertHexToRgb(hex) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;

  return {
    r,
    g,
    b,
  };
}

function convertToXyzRatio(color) {
  return {
    x: color.r / 0xff,
    y: color.g / 0xff,
    z: color.b / 0xff,
  };
}

class OutlineShader extends Phaser.Filter {
  constructor(game) {
    super(game);

    this.uniforms.outlineColor = {
      type: '4f',
      value: { x: 1.0, y: 1.0, z: 1.0, w: 1.0 },
    };
    this.uniforms.minBounds = {
      type: '2f',
      value: { x: 0.0, y: 0.0 },
    };
    this.uniforms.maxBounds = {
      type: '2f',
      value: { x: 1.0, y: 1.0 },
    };

    this.fragmentSrc = `
        precision mediump float;
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        
        uniform vec4 outlineColor;
        uniform vec2 minBounds;
        uniform vec2 maxBounds;

        void main(void) {
          vec4 color = texture2D(uSampler, vTextureCoord);

          float borderThickness = 0.002;

          vec4 colorU = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - borderThickness));
          vec4 colorD = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + borderThickness));
          vec4 colorL = texture2D(uSampler, vec2(vTextureCoord.x + borderThickness, vTextureCoord.y));
          vec4 colorR = texture2D(uSampler, vec2(vTextureCoord.x - borderThickness, vTextureCoord.y));
          
          // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

          gl_FragColor = color;

          // if (vTextureCoord.x < 0.035) {
          //   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
          // }
          
          if (color.a == 0.0 && (colorU.a != 0.0 || colorD.a != 0.0 || colorL.a != 0.0 || colorR.a != 0.0)  ) {
              gl_FragColor = outlineColor;
          }
        }
    `;
  }

  setColor(value) {
    const rgb = convertHexToRgb(value);
    const ratio = convertToXyzRatio(rgb);

    this.uniforms.outlineColor.value = { ...ratio, w: 1.0 };
  }

  setSprite(sprite) {
    // Access uv values from Phaser.Sprite's underlying PIXI.Texture
    const { x0, y0, x2, y2 } = sprite.texture._uvs;

    // console.log(sprite.texture);
    // console.log(x0, y0, x2, y2);

    this.uniforms.minBounds.value = { x: x0, y: y0 };
    this.uniforms.maxBounds.value = { x: x2, y: y2 };
  }
}

export default OutlineShader;
