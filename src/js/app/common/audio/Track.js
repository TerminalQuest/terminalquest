import { Howl, Howler } from 'howler';

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}

class Track {
  constructor(fileUrls, { loopTimestamp = 0, onload }) {
    this.loaded = false;
    this.volume = 0.5;
    this.maxVolume = 1.0;
    this.fadeDuration = 2000;
    this.fadingIn = false;
    this.fadingState = 'none'; // none, in, inToOut, out, outToIn, toEffective
    this.currentlyPlayingSprite;

    this.track = new Howl({
      src: [...fileUrls],
      onend: this.onEnd.bind(this),
      onfade: this.onFade.bind(this),
      onload: () => {
        this.loaded = true;

        // create loop audo sprite
        this.track._sprite.loop = [
          loopTimestamp,
          this.track.duration() * 1000 - loopTimestamp,
          true,
        ];

        // create intro audio sprite
        if (loopTimestamp > 0) {
          this.track._sprite.intro = [0, loopTimestamp];
        }

        onload();
      },
    });
  }

  hasIntro() {
    return Boolean(this.track._sprite.intro);
  }

  play(sprite) {
    this.track.volume(this.getEffectiveVolume());
    this.track.play(sprite);
    this.currentlyPlayingSprite = sprite || '_default';
  }

  stop() {
    this.track.stop();
    this.currentlyPlayingSprite = undefined;
  }

  mute(muted) {
    this.track.mute(muted);
  }

  getCurrentVolume() {
    return this.track.volume();
  }

  getEffectiveVolume() {
    return clamp(this.volume, 0, this.maxVolume);
  }

  setMaxVolume(maxVolume, fade = true) {
    this.maxVolume = maxVolume;

    // Ensure the current volume of the underlying Track matches the
    // new effective Volume.
    if (fade) {
      this.fadeToEffective();
    } else {
      this.setVolume(this.volume);
    }
  }

  setVolume(level) {
    this.volume = level;
    this.track.volume(this.getEffectiveVolume());
  }

  /**
   * Howler.js's (version ^2.1.2) once and off event emitter functionality doesn't seem to be working,
   * so this solution instead must track the global state and determine when to stop a track instead.
   */
  onFade() {
    // In Howler.js, a track can only have a single fade running at one time. When a new fade is
    // started (or track volume is set), the previous fade is called. That triggers this event handler.
    // Because of this, when we're transitioning from one fade to another we need to handle
    // these as different states.
    switch (this.fadingState) {
      case 'out':
        this.fadingState = 'none';
        this.stop();
        break;
      case 'in':
        this.fadingState = 'none';
        break;
      case 'inToOut':
        this.fadingState = 'out';
        break;
      case 'outToIn':
        this.fadingState = 'in';
        break;
      default:
        break;
    }
  }

  onEnd() {
    if (this.fadingState === 'in' && this.currentlyPlayingSprite === 'intro') {
      this.play('loop');
    }
  }

  fadeToEffective() {
    this.fadingState = 'toEffective';

    this.track.fade(
      this.track.volume(),
      this.getEffectiveVolume(),
      this.fadeDuration
    );
  }

  fadeIn() {
    if (this.fadingState === 'out') {
      this.fadingState = 'outToIn';
    } else {
      this.fadingState = 'in';

      if (this.hasIntro()) {
        this.play('intro');
      } else {
        this.play('loop');
      }
    }

    this.track.fade(0, this.getEffectiveVolume(), this.fadeDuration);
  }

  fadeOut() {
    if (this.fadingState === 'in') {
      this.fadingState = 'inToOut';
    } else {
      this.fadingState = 'out';
    }

    this.track.fade(this.getCurrentVolume(), 0, this.fadeDuration);
  }
}

export default Track;
