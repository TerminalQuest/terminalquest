import Track from './Track';

class TrackPlayer {
  loading = false;
  loaded = false;
  muted = false;
  volume = 0.5;
  currentlyPlayingTracks = [];
  tracks = {};

  constructor(audioManager) {
    this.audioManager = audioManager;
  }

  register(key, fileUrls) {
    this.tracks[key] = new Track(fileUrls, {
      onload: () => this.checkLoaded(key),
    });
    this.tracks[key].setVolume(this.volume);
  }

  /**
   * Signal all tracks have been registered to this TrackPlayer. After this call, newly registered tracks
   * are not guaranteed to trigger TrackPlayer.onload.
   */
  load() {
    this.loading = true;

    // All tracks might already be loaded by now
    this.checkLoaded();
  }

  areAllTracksLoaded() {
    return Object.values(this.tracks).every(track => Boolean(track.loaded));
  }

  checkLoaded() {
    if (this.loading && this.areAllTracksLoaded()) {
      this.loaded = true;

      this.upateTracksMuteStatus();

      this.onload();
    }
  }

  onload() {
    // Override TrackPlayer.onload for custom on load behavior
  }

  isTrackNameValid(trackName) {
    if (!trackName) {
      return false;
    }

    if (!this.tracks[trackName]) {
      console.warn(`Cannot play track: ${trackName}. Track not loaded.`);
      return false;
    }

    return true;
  }

  play(trackName, onEnd = () => {}) {
    if (!this.isTrackNameValid(trackName)) {
      return;
    }

    this.currentlyPlayingTracks.push(trackName);
    this.tracks[trackName].play();

    this.tracks[trackName].track.on('end', onEnd);
  }

  stopAll() {
    this.currentlyPlayingTracks.forEach(trackName => {
      this.tracks[trackName].stop();
    });
    this.currentlyPlayingTracks = [];
  }

  stop(trackName) {
    if (!this.isTrackNameValid(trackName)) {
      return;
    }

    // remove track from currently playing
    const index = this.currentlyPlayingTracks.indexOf(trackName);
    this.currentlyPlayingTracks = [
      ...this.currentlyPlayingTracks.slice(0, index),
      ...this.currentlyPlayingTracks.slice(index + 1),
    ];
    this.tracks[trackName].stop();
  }

  mute() {
    this.muted = true;

    this.upateTracksMuteStatus();
  }

  unMute() {
    this.muted = false;

    this.upateTracksMuteStatus();
  }

  upateTracksMuteStatus() {
    if (this.muted) {
      Object.values(this.tracks).forEach(track => track.mute(true));
    } else if (this.audioManager.muted) {
      Object.values(this.tracks).forEach(track => track.mute(true));
    } else {
      Object.values(this.tracks).forEach(track => track.mute(false));
    }
  }

  setMaxVolumeAll(volume, fade) {
    Object.values(this.tracks).forEach(track =>
      track.setMaxVolume(volume, fade)
    );
  }

  setVolumeAll(volume) {
    this.volume = volume;
    Object.values(this.tracks).forEach(track => track.setVolume(volume));
  }

  setVolume(trackName, volume) {
    if (!this.isTrackNameValid(trackName)) {
      return;
    }

    this.tracks[trackName].setVolume(volume);
  }

  fadeIn(trackName) {
    if (!this.isTrackNameValid(trackName)) {
      return;
    }

    this.currentlyPlayingTracks.push(trackName);
    this.tracks[trackName].fadeIn();
  }

  fadeOutAll() {
    this.currentlyPlayingTracks.forEach(trackName => {
      this.tracks[trackName].fadeOut();
    });
    this.currentlyPlayingTracks = [];
  }
}

export default TrackPlayer;
