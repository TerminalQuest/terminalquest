import { useState } from 'react';
import path from 'path';
import * as jetpack from 'fs-jetpack';
import Store from 'electron-store';
import { staticFilePath, staticFileUrl } from '../fs_utils';
import TrackPlayer from './TrackPlayer';
import { readDirectory, resolveAbsolutePath } from '../assetLoader';
import levelLoader from '../levelLoader';

const SUPPORTED_FILE_EXTENSIONS = ['.mp3', '.ogg', '.wav'];

const DEFAULT_AUDIO_STATE = {
  master: {
    muted: false,
  },
  vo: {
    volume: 0.6,
    muted: false,
  },
  music: {
    volume: 0.15,
    muted: false,
  },
  sfx: {
    volume: 0.5,
    muted: false,
  },
};

class VoiceOverPlayer extends TrackPlayer {
  play(trackName) {
    // Do not play multiple voice overs at the same time, stop all previously playing ones
    super.stopAll();
    super.play(trackName);
  }
}

class MusicPlayer extends TrackPlayer {
  play(trackName) {
    // Do not play multiple tracks at the same time, fade the previously playing into this one
    if (this.currentlyPlayingTracks.length > 0) {
      // There should only ever be one musical track playing at the same time
      super.fadeOutAll();
    }
    super.fadeIn(trackName);
  }

  stopAll() {
    super.fadeOutAll();
  }
}

class AudioManager {
  muted = false;
  loaded = false;
  store = new Store();

  constructor() {
    this.vo = new VoiceOverPlayer(this);

    this.sfx = new TrackPlayer(this);
    this.sfx.onload = () => this.checkLoaded('sfx');

    this.music = new MusicPlayer(this);
    this.music.onload = () => this.checkLoaded('music');

    // Expose master audio channel controls on this namespace to
    // make them analgous to the other channels.
    this.master = {
      unMute: this.unMute.bind(this),
      mute: this.mute.bind(this),
    };
  }

  areAllPlayersLoaded() {
    // We do not need to track onload for vo, because it is loaded per level right now

    return this.sfx.loaded && this.music.loaded;
  }

  checkLoaded(key) {
    if (this.areAllPlayersLoaded()) {
      this.loaded = true;

      this.loadState();

      this.onload();
    }
  }

  onload() {
    // Override AudioManager.onload for custom on load behavior, after all files have been loaded
  }

  mute() {
    this.muted = true;

    this.vo.upateTracksMuteStatus();
    this.sfx.upateTracksMuteStatus();
    this.music.upateTracksMuteStatus();
  }

  unMute() {
    this.muted = false;

    this.vo.upateTracksMuteStatus();
    this.sfx.upateTracksMuteStatus();
    this.music.upateTracksMuteStatus();
  }

  loadState() {
    let audioState = this.store.get('audio');

    if (!audioState) {
      audioState = DEFAULT_AUDIO_STATE;
    }

    Object.entries(audioState).forEach(([channel, channelState]) => {
      if (channelState.muted) {
        this[channel].mute();
      } else {
        this[channel].unMute();
      }

      if (channel !== 'master') {
        this[channel].setVolumeAll(channelState.volume);
      }
    });
  }

  saveState() {
    this.store.set('audio', this.getState());
  }

  getState() {
    return {
      master: {
        muted: this.muted,
        volume: this.volume,
      },
      vo: {
        muted: this.vo.muted,
        volume: this.vo.volume,
      },
      music: {
        muted: this.music.muted,
        volume: this.music.volume,
      },
      sfx: {
        muted: this.sfx.muted,
        volume: this.sfx.volume,
      },
    };
  }

  loadSfx() {
    const sfxDirPath = staticFilePath(`levels/common/sfx`);
    const sfxFileUrls = {};
    jetpack.list(sfxDirPath).forEach(fileName => {
      const fileExtension = path.extname(fileName);
      if (SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
        const baseName = path.basename(fileName, fileExtension);
        const fileUrl = staticFileUrl(`${sfxDirPath}/${fileName}`);

        sfxFileUrls[baseName] = sfxFileUrls[baseName]
          ? [...sfxFileUrls[baseName], fileUrl]
          : [fileUrl];
      }
    });

    Object.entries(sfxFileUrls).map(([key, fileUrls]) => {
      this.sfx.register(key, fileUrls);
    });

    this.sfx.load();
  }

  loadMusic() {
    const musicDirPath = staticFilePath(`levels/common/music`);
    const musicFileUrls = {};
    jetpack.list(musicDirPath).forEach(fileName => {
      const fileExtension = path.extname(fileName);
      if (SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
        const baseName = path.basename(fileName, fileExtension);
        const fileUrl = staticFileUrl(`${musicDirPath}/${fileName}`);

        musicFileUrls[baseName] = musicFileUrls[baseName]
          ? [...musicFileUrls[baseName], fileUrl]
          : [fileUrl];
      }
    });

    Object.entries(musicFileUrls).map(([key, fileUrls]) => {
      this.music.register(key, fileUrls);
    });

    this.music.load();
  }

  async loadLevelAudio(levelName) {
    const soundFileUrls = {};

    const voiceOverDirPath = levelLoader.getConversationsVoiceOverDir(
      levelName
    );
    const voiceOverFiles = await readDirectory(voiceOverDirPath);

    if (voiceOverFiles === undefined) {
      // There is nothing to load, so short circuit
      return;
    }

    const voiceOverReadPromises = voiceOverFiles.map(async fileName => {
      const fileExtension = path.extname(fileName);

      if (SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
        const baseName = path.basename(fileName, fileExtension);
        const relativeFilePath = path.join(voiceOverDirPath, fileName);
        const fileUrl = await resolveAbsolutePath(relativeFilePath);

        // Initialize sound file url for our base name,
        // or add this file url to the existing list
        soundFileUrls[baseName] = soundFileUrls[baseName]
          ? [...soundFileUrls[baseName], fileUrl]
          : [fileUrl];
      }
    });

    await Promise.all(voiceOverReadPromises);

    Object.entries(soundFileUrls).map(([key, fileUrls]) => {
      this.vo.register(key, fileUrls);
    });

    this.vo.load();
  }
}

const audioManager = new AudioManager();

const useAudioManager = () => {
  const [audioState, setState] = useState(audioManager.getState());

  const syncAudioState = () => {
    setState(audioManager.getState());
    audioManager.saveState();
  };

  return { audioState, syncAudioState, audioManager };
};

export { useAudioManager };
export default audioManager;
