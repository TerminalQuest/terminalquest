import React from 'react';
import PropTypes from 'prop-types';
import { keypress } from 'keypress.js';
import InlineButton from './InlineButton';
import InputTextField from './InputTextField';

export default class AsyncInputBox extends React.Component {
  static propTypes = {
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    autoFocus: PropTypes.bool,
    defaultButtonLabel: PropTypes.string,
    resolvingButtonLabel: PropTypes.string,
    enableSubmitHotkey: PropTypes.bool,
    onSuccess: PropTypes.func,
  };

  static defaultProps = {
    defaultButtonLabel: 'Submit',
    resolvingButtonLabel: 'Submitting...',
    autoFocus: true,
    enableSubmitHotkey: true,
    onSuccess: () => {},
  };

  states = {
    RESOLVING: 'RESOLVING',
    INVALID: 'INVALID',
    VALID: 'VALID',
    DEFAULT: 'DEFAULT',
  };

  state = {
    currentState: this.states.DEFAULT,
    value: '',
    message: '',
  };

  attachSubmitHotkey() {
    this.keyPressListener = new keypress.Listener();

    this.keyPressListener.simple_combo('enter', () =>
      this.buttonRef.current.click()
    );
  }

  deattachSubmitHotKey() {
    if (this.keyPressListener) {
      this.keyPressListener.stop_listening();
    }
  }

  componentDidMount() {
    const { enableSubmitHotkey } = this.props;

    this.buttonRef = React.createRef();

    if (enableSubmitHotkey) {
      this.attachSubmitHotkey();
    }
  }

  componentWillUnmount() {
    this.deattachSubmitHotKey();
  }

  componentDidUpdate(prevProps, prevState) {
    const { currentState } = this.state;
    const { enableSubmitHotkey } = this.props;

    if (prevProps.enableSubmitHotkey && !enableSubmitHotkey) {
      this.deattachSubmitHotKey();
    }

    if (!prevProps.enableSubmitHotkey && enableSubmitHotkey) {
      this.attachSubmitHotkey();
    }

    if (
      prevState.currentState !== this.states.VALID &&
      currentState === this.states.VALID
    ) {
      this.props.onSuccess();
    }
  }

  render() {
    const { onFocus, onBlur, onSubmit, autoFocus } = this.props;
    const { currentState, value } = this.state;

    return (
      <>
        <InputTextField
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={evt => {
            if (currentState !== this.states.RESOLVING) {
              this.setState({
                value: evt.target.value,
                currentState: this.states.DEFAULT,
              });
            }
          }}
          value={value}
          invalid={currentState === this.states.INVALID}
          autoFocus={autoFocus}
        />
        <InlineButton
          label={this.getButtonLabel()}
          buttonRef={this.buttonRef}
          onClick={() => {
            // Only allow one code submission at once
            if (currentState === this.states.RESOLVING) {
              return;
            }

            // mark submission in progress
            this.setState({
              currentState: this.states.RESOLVING,
            });

            onSubmit(value).then(({ success, message }) => {
              if (success) {
                this.setState({
                  currentState: this.states.VALID,
                  value: '',
                  message: message || 'Success!',
                });
              } else {
                this.setState({
                  currentState: this.states.INVALID,
                  message: message || 'Error!',
                });
              }
            });
          }}
          disabled={currentState === this.states.RESOLVING}
        />
        <span
          style={{
            color: this.getMessageColor(),
            display: this.shouldShowMessage() ? 'inline-block' : 'none',
          }}
          className="f6 ml4 shake"
        >
          {this.state.message}
        </span>
      </>
    );
  }

  getButtonLabel() {
    switch (this.state.currentState) {
      case this.states.DEFAULT:
      case this.states.INVALID:
      case this.states.VALID:
      default:
        return this.props.defaultButtonLabel;
      case this.states.RESOLVING:
        return this.props.resolvingButtonLabel;
    }
  }

  getMessageColor() {
    switch (this.state.currentState) {
      case this.states.INVALID:
        return '#ff0000';
      case this.states.VALID:
        return '#00ff00';
      default:
        return '#ffffff';
    }
  }

  shouldShowMessage() {
    switch (this.state.currentState) {
      case this.states.INVALID:
      case this.states.VALID:
        return true;
      default:
        return false;
    }
  }
}
