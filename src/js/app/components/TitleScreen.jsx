import React from 'react';
import PropTypes from 'prop-types';
import ga from '../common/analytics';
import sharedListener from '../common/listener';
import audioManager from '../common/audio/index';
import { getContext, setContext } from '../common/context';

const CINEMATIC_PAGE = './cinematic';
const CINEMATIC_PAGE_TITLE = 'Mission Cinematic Cinematic';

export default class TitleScreen extends React.Component {
  static propTypes = {
    close: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      isInitialGameLaunch: false,
      cinematicShowing: false,
      shouldStartGameAfterFinishingCinematic: false,
      muteCinematic: false,
    };
  }

  componentDidMount() {
    this.spaceListener = sharedListener.simple_combo(
      'space',
      this.onPlayerPressedStart.bind(this)
    );
    this.escapeListener = sharedListener.simple_combo('escape', () => {
      if (this.state.cinematicShowing) {
        this.hideCinematic();
      }
    });
    ga.pageview('/', 'Title Screen');
    ga.event('Lifecycle', 'Launch', ga.appVersion);

    this.setState({
      muteCinematic: audioManager.muted,
      // We treat a player launch as the player making it
      // to the cinematic screen. This is the earliest interaction
      // a player could have that we track and save locally.
      // If they've not seen the cinematic yet, this is
      // their initial launch.
      isInitialGameLaunch: !getContext('hasSeenCinematic'),
    });

    audioManager.music.play('overture_b');
  }

  componentWillUnmount() {
    sharedListener.unregister_combo(this.spaceListener);
    sharedListener.unregister_combo(this.escapeListener);
  }

  onPlayerPressedStart() {
    if (!getContext('hasSeenCinematic')) {
      this.showCinematic(true);
    } else {
      this.startGame();
    }
  }

  startGame() {
    this.props.close();
  }

  showCinematic(shouldStartGameAfterFinishingCinematic = false) {
    ga.pageview(CINEMATIC_PAGE, CINEMATIC_PAGE_TITLE);
    audioManager.music.fadeOutAll();
    setContext({ hasSeenCinematic: true });

    this.setState({
      shouldStartGameAfterFinishingCinematic,
      cinematicShowing: true,
    });
  }

  hideCinematic() {
    audioManager.music.play('overture_b');
    this.setState({ cinematicShowing: false });
  }

  onCinematicEnded() {
    const {
      shouldStartGameAfterFinishingCinematic,
      isInitialGameLaunch,
    } = this.state;

    if (shouldStartGameAfterFinishingCinematic) {
      let eventAction = 'Finished Cinematic';

      if (isInitialGameLaunch) {
        eventAction = 'Finished Cinematic - Initial Viewing';
      }

      ga.event(
        'Cinematic',
        eventAction,
        'Introduction cinematic',
        null,
        CINEMATIC_PAGE,
        CINEMATIC_PAGE_TITLE
      );

      this.startGame();
    } else {
      this.hideCinematic();
    }
  }

  toggleMute() {
    this.setState({
      muteCinematic: !this.state.muteCinematic,
    });
  }

  render() {
    const startScreen = (
      <div className="inner">
        <div className="logo" style={{ 
          fontSize: '3em',
          textAlign: 'center' 
        }}>
          TerminalQuest
        </div>
        <div className="controls">
          <span onClick={() => this.onPlayerPressedStart()}>
            press spacebar to start
          </span>
          {!getContext('hasSeenCinematic') ? (
            ''
          ) : (
            <span
              onClick={() => this.showCinematic()}
              style={{
                display: 'inline-block',
                marginTop: '30px',
                fontSize: '0.7em',
              }}
            >
              <i className="fas fa-play" />
              &nbsp;mission briefing
            </span>
          )}
        </div>
      </div>
    );

    const cinematic = (
      <div className="cinematic">
        <div className="metaControls">
          <span onClick={() => this.hideCinematic()}>
            Back to Title (ESC Key)
          </span>
          <span onClick={() => this.toggleMute()}>
            {this.state.muteCinematic ? 'UNMUTE' : 'MUTE'} AUDIO
          </span>
          <span
            onClick={() => {
              let eventAction = 'Skipped Cinematic';

              if (this.state.isInitialGameLaunch) {
                eventAction = 'Skipped Cinematic - Initial Viewing';
              }

              ga.event(
                'Cinematic',
                eventAction,
                'Introduction cinematic',
                null,
                CINEMATIC_PAGE,
                CINEMATIC_PAGE_TITLE
              );

              this.onPlayerPressedStart();
            }}
          >
            Start Game (SPACEBAR)
          </span>
        </div>
        <video
          autoPlay
          onEnded={() => this.onCinematicEnded()}
          muted={this.state.muteCinematic}
        >
          <source src="movies/opening_cinematic.mp4" type="video/mp4" />
        </video>
      </div>
    );

    return (
      <div className="TitleScreen">
        <div className="stars" />
        {this.state.cinematicShowing ? cinematic : startScreen}
      </div>
    );
  }
}
