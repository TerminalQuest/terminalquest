import React from 'react';
import cx from 'classnames';

export default class Button extends React.Component {
  render() {
    return (
      <button
        className={cx('Button', this.props.className)}
        disabled={this.props.disabled}
        onClick={e => this.props.onClick && this.props.onClick(e)}
        style={this.props.style || {}}
        title={this.props.title}
      >
        <div className="inner">{this.props.label || this.props.children}</div>
      </button>
    );
  }
}
