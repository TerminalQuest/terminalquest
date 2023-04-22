import React from 'react';

export default class InputTextField extends React.Component {
  render() {
    const {
      onFocus,
      onBlur,
      onChange,
      value,
      invalid,
      autoFocus = true,
      disabled,
    } = this.props;

    return (
      <input
        style={{
          borderColor: invalid ? '#ff0000' : '',
          color: invalid ? '#ff0000' : '',
          display: 'block',
        }}
        autoFocus={autoFocus}
        className="pa2 w-100 mw7"
        onChange={onChange}
        type="text"
        onFocus={onFocus}
        onBlur={onBlur}
        value={value}
        disabled={disabled}
      />
    );
  }
}
