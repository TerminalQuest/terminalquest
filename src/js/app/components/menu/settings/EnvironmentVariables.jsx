import React from 'react';
import PropTypes from 'prop-types';
import ConcealedInputField from './ConcealedInputField';

export default class EnvironmentVariables extends React.Component {
  static propTypes = {
    env: PropTypes.object,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
  };

  state = {
    envVarsLocked: true,
  };

  toggleEnvVarLock() {
    this.setState({ envVarsLocked: !this.state.envVarsLocked });
  }

  renderLockControl() {
    return (
      <span key="envToggle"
        className="underline pointer"
        onClick={this.toggleEnvVarLock.bind(this)}
      >
        {this.state.envVarsLocked ? 'Unlock' : 'Lock'}
      </span>
    );
  }

  renderEmptyState() {
    return (
      <h5>
        Variables will appear here when unlocked in missions.
      </h5>
    );
  }

  render() {
    const envKeys = Object.keys(this.props.env);

    return (
      <div>
        <h3 className="mb2" key="title">
          Environment Variables
        </h3>
        <p>
          Missions in TerminalQuest will save important data as "environment
          variables" to use them across different missions. If you need to change
          any of them, click "Unlock" and edit them using the fields below.
        </p>
        {!!envKeys.length ? this.renderLockControl() : this.renderEmptyState()}
        {envKeys
          .filter(key => this.props.env[key] !== undefined)
          .map(key => {
            const { value, concealed } = this.props.env[key];
            if (concealed) {
              return (
                <div key={key}>
                  <p className="mb2">{key}</p>
                  <ConcealedInputField
                    className="pa2 w-100 mw7"
                    onChange={value => this.props.onChange(key, value, 'env')}
                    type="text"
                    disabled={this.state.envVarsLocked}
                    onFocus={this.props.onFocus}
                    onBlur={this.props.onBlur}
                    value={'•'.repeat(value.length)}
                  />
                </div>
              );
            } else {
              return (
                <div key={key}>
                  <p className="mb2">{key}</p>
                  <input
                    className="pa2 w-100 mw7"
                    onChange={evt =>
                      this.props.onChange(key, evt.target.value, 'env')
                    }
                    type="text"
                    disabled={this.state.envVarsLocked}
                    onFocus={this.props.onFocus}
                    onBlur={this.props.onBlur}
                    value={value}
                  />
                </div>
              );
            }
          })}
      </div>
    );
  }
}
