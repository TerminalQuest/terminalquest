import React from 'react';
import PropTypes from 'prop-types';
import { context, setContext } from '../../common/context';

export default class NameStep extends React.Component {
  static propTypes = {
    isActive: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    setValid: PropTypes.func.isRequired,
  };

  static contextType = context;

  updateName(name) {
    setContext({ 'settings': { ...this.context.settings, name }});
    this.props.setValid(!!name);
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isActive && this.props.isActive) {
      this.inputRef.focus();
      this.props.setValid(!!this.context.settings.name);
    }
  }

  render() {
    return (
      <div
        className={this.props.isActive ? '' : 'o-50'}
        onClick={this.props.onClick}
      >
        <h3>Enter your name</h3>
        <span className="caret">&gt;&nbsp;</span>
        <input
          autoFocus
          className="white bw0 outline-0"
          disabled={!this.props.isActive}
          onChange={evt => this.updateName(evt.target.value)}
          ref={node => this.inputRef = node}
          type="text"
          value={this.context.settings.name}
        />
      </div>
    );
  }
}
