import React from 'react';
import PropTypes from 'prop-types';
import { keypress } from 'keypress.js';
import { JoinTeam } from '../menu/settings/AdventureTeams';
import { context, setContext } from '../../common/context';

export default class LiveEventStep extends React.Component {
  static propTypes = {
    isActive: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    setValid: PropTypes.func.isRequired,
  };

  static contextType = context;

  state = {
    liveEventAnswer: false,
  };

  componentDidMount() {
    this.props.setValid(true);
    this.setState({ liveEventAnswer: !!this.context.liveEvent });

    this.listener = new keypress.Listener();
    this.listener.simple_combo('left', () => this.toggleLiveEventAnswer());
    this.listener.simple_combo('right', () => this.toggleLiveEventAnswer());
  }

  componentWillUnmount() {
    this.listener.destroy();
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isActive && this.props.isActive) {
      this.props.setValid(true);
    }
  }

  toggleLiveEventAnswer() {
    this.selectLiveEventAnswer(!this.state.liveEventAnswer);
  }

  selectLiveEventAnswer(liveEventAnswer) {
    this.setState({ liveEventAnswer });

    if (liveEventAnswer === false) {
      setContext({ liveEvent: null });
      this.props.setValid(true);
    } else {
      this.props.setValid(false);
    }
  }

  render() {
    return (
      <div
        className={this.props.isActive ? '' : 'o-50'}
        onClick={this.props.onClick}
      >
        <h3 className="mt2 mb2">Do you have an adventure team join code?</h3>
        <div className="flex justify-around tc mv3">
          <div
            className={`${
              !this.state.liveEventAnswer ? `b--green` : `b--mid-gray pointer`
            } ba bw2 w-50 pa2 mr2`}
            onClick={() => this.selectLiveEventAnswer(false)}
          >
            NO
          </div>
          <div
            className={`${
              this.state.liveEventAnswer ? `b--green` : `b--mid-gray pointer`
            } ba bw2 w-50 pa2 ml2`}
            onClick={() => this.selectLiveEventAnswer(true)}
          >
            YES
          </div>
        </div>
        {this.state.liveEventAnswer && (
          <>
            <h3>Enter your team join code:</h3>
            <JoinTeam
              onSuccess={() => this.props.setValid(true)}
              enableSubmitHotkey={!this.context.liveEvent}
            />
          </>
        )}
      </div>
    );
  }
}
