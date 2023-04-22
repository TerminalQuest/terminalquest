import React from 'react';
import { remote } from 'electron';
import PropTypes from 'prop-types';
import cx from 'classnames';
import update from 'immutability-helper';
import merge from 'lodash.merge';
import ClearDataButton from '../../ClearDataButton';
import ga from '../../../common/analytics';
import sharedListener from '../../../common/listener';
import AvatarSelector from '../../AvatarSelector';
import EnvironmentVariables from './EnvironmentVariables';
import { JoinTeam, CurrentTeam } from './AdventureTeams';
import { JoinOperation, CurrentOperation } from './Operations';
import { setContext, getContext } from '../../../common/context';
import AudioTab from './AudioTab';
import UnlocksTab from './UnlocksTab';
import Credits from './Credits';
import Extensions from './Extensions';
import { staticFilePath } from '../../../common/fs_utils';

const GAME_VERSION = require(staticFilePath('package.json')).version;
const SUBNAV_SECTIONS = [
  'Audio',
  'User',
  'Variables',
  'Extensions',
  'Teams',
  'Operations',
  'Unlocks',
  'Credits',
];

export default class Settings extends React.Component {
  static propTypes = {
    subnav: PropTypes.string,
    env: PropTypes.object,
    name: PropTypes.string,
    avatar: PropTypes.number,
  };

  static defaultProps = {
    subnav: SUBNAV_SECTIONS[0],
  };

  state = {
    saved: false,
    inputFocused: false,
    showGuid: false,
  };

  componentDidMount() {
    ga.pageview(`/menu/settings/${this.props.subnav}`, `Settings: ${this.props.subnav}`);
  }

  componentDidUpdate(prevProps) {
    if (this.props.subnav !== prevProps.subnav) {
      // We have changed our subnav location
      ga.pageview(`/menu/settings/${this.props.subnav}`, `Settings: ${this.props.subnav}`);    
    }
  }

  save(key, value, type = 'setting') {
    if (type === 'setting') {
      setContext({ settings: { ...getContext('settings'), [key]: value } });
    } else if (type === 'env') {
      // Use update helper to set nested property
      setContext({
        env: update(getContext('env'), { [key]: { $merge: { value } } }),
      });
    } else if (type === 'context') {
      // handle other context updates
      setContext({
        [key]: merge({}, getContext(key), value)
      })
    }

    window.clearTimeout(this.timeoutID);
    this.setState({ saved: false });
    this.timeoutID = window.setTimeout(() => {
      this.setState({ saved: true });
    }, 500);
  }

  onFocus() {
    sharedListener.stop_listening();
    this.setState({ inputFocused: true });
  }

  onBlur() {
    sharedListener.listen();
    this.setState({ inputFocused: false });
  }

  onToggleGuid() {
    this.setState({
      showGuid: !this.state.showGuid
    });
  }

  render() {
    return (
      <div className="settings-menu pv3 overflow-y-scroll h-100">
        <ClearDataButton />
        <h2 className="mb1">Settings</h2>
        <p className="game-version gray">
          TerminalQuest v{GAME_VERSION} |&nbsp;
          {
            (this.state.showGuid) ? 
              <span>
                {ga.analyticsId}
                &nbsp;<span style={{
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }} onClick={() => this.onToggleGuid()}>
                  Hide
                </span>
              </span>
              
            : 
              <span style={{
                textDecoration: 'underline',
                cursor: 'pointer'
              }} onClick={() => this.onToggleGuid()}>
                Show Player GUID
              </span>
          }
        </p>

        <div className="flex mt1">
          <div className="w-25 contents">
            {SUBNAV_SECTIONS.map(section => (
              <h5
                key={section}
                className={`pa2 mr3 mv2 ${
                  this.props.subnav !== section ? 'pointer' : 'selected'
                }`}
                onClick={() => {
                  setContext({
                    currentMenu: { name: 'settings', subnav: section },
                  });
                }}
              >
                {section}
              </h5>
            ))}
          </div>

          <div className="w-75">
            {this.props.subnav === 'User' && (
              <div>
                <h3>User Settings</h3>
                <h4 className="mv2">Name</h4>
                <input
                  autoFocus
                  className="pa2 w-100 mw7"
                  onChange={evt => this.save('name', evt.target.value)}
                  type="text"
                  onFocus={this.onFocus.bind(this)}
                  onBlur={this.onBlur.bind(this)}
                  value={this.props.name}
                />

                <h4 className="mb2 mt4">Avatar</h4>
                <AvatarSelector
                  avatar={this.props.avatar}
                  hotkeysEnabled={!this.state.inputFocused}
                  selectAvatar={this.save.bind(this, 'avatar')}
                />
              </div>
            )}

            {this.props.subnav === 'Variables' && (
              <EnvironmentVariables
                onFocus={this.onFocus.bind(this)}
                onBlur={this.onBlur.bind(this)}
                onChange={this.save.bind(this)}
                env={this.props.env}
              />
            )}

            {this.props.subnav === 'Extensions' && (
              <Extensions
                onFocus={this.onFocus.bind(this)}
                onBlur={this.onBlur.bind(this)}
                save={this.save.bind(this)}
              />
            )}

            {this.props.subnav === 'Audio' && <AudioTab />}

            {this.props.subnav === 'Credits' && <Credits />}

            {this.props.subnav === 'Teams' && (
              <div className="LiveEvents">
                <h3>Adventure Teams</h3>
                <p>
                  If you were given an adventure team join code, type it in to
                  send your achievements and XP to the leaderboard.
                </p>
                <h4 className="mv2">Join Code</h4>
                <JoinTeam
                  onFocus={this.onFocus.bind(this)}
                  onBlur={this.onBlur.bind(this)}
                />
                <CurrentTeam />
              </div>
            )}

            {this.props.subnav === 'Operations' && (
              <div className="LiveEvents">
                <h3>Operations</h3>
                <p>
                  If you were given an operation join code, type it in to
                  send your achievements and XP to the leaderboard.
                </p>
                <h4 className="mv2">Join Code</h4>
                <JoinOperation
                  onFocus={this.onFocus.bind(this)}
                  onBlur={this.onBlur.bind(this)}
                />
                <CurrentOperation />
              </div>
            )}

            {this.props.subnav === 'Unlocks' && (
              <UnlocksTab
                onFocus={this.onFocus.bind(this)}
                onBlur={this.onBlur.bind(this)}
              />
            )}
          </div>
        </div>

        {this.state.saved && (
          <div
            className="tc gray absolute bottom-0 left-0 w-100 pt1 pb1"
            style={{ backgroundColor: '#1f243c' }}
          >
            All changes saved.
          </div>
        )}
      </div>
    );
  }
}
