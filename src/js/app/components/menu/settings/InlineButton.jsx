import React from 'react';

export default class InlineButton extends React.Component {
  render() {
    const { label, onClick, buttonRef, disabled } = this.props;

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '5px',
          border: '1px solid',
          color: disabled ? '#787878' : '#eeeeee',
        }}
        disabled={disabled}
        className="pointer mv2"
        onClick={onClick}
        ref={buttonRef}
      >
        {label}
      </span>
    );
  }
}
