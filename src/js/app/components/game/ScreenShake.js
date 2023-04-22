/**
 * Plugin to make screen shake FX (makes number of short camera movements).
 *
 */
class ScreenShake extends Phaser.Plugin {
  constructor(game, parent) {
    super(game, parent);

    //settings by default
    this._settings = {
      shakesCount: 0,
      shakeX: true,
      shakeY: true,
      sensCoef: 0.5,
    };
    this.game.camera.bounds = null;
  }

  /**
   * Change default settings object values with passed object value.
   *
   * @method Phaser.Plugin.ScreenShake#setup
   * @param {object} [obj] - Passed object to merge
   */
  setup(obj) {
    this._settings = Phaser.Utils.extend(false, this._settings, obj);
  }

  /**
   * Pass value of count shakes.
   *
   * @method Phaser.Plugin.ScreenShake#shake
   * @param {number} [count] - Value of count shakes
   */
  shake(count) {
    this._settings.shakesCount = count;
  }

  update() {
    this._moveCamera();
  }

  /**
   * screen shake FX.
   */
  _moveCamera() {
    if (this._settings.shakesCount > 0) {
      var sens = this._settings.shakesCount * this._settings.sensCoef;

      if (this._settings.shakesCount % 2) {
        this.game.camera.x += this._settings.shakeX ? sens : 0;
        this.game.camera.y += this._settings.shakeY ? sens : 0;
      } else {
        this.game.camera.x -= this._settings.shakeX ? sens : 0;
        this.game.camera.y -= this._settings.shakeY ? sens : 0;
      }

      this._settings.shakesCount--;
    }
  }
}

export default ScreenShake;
