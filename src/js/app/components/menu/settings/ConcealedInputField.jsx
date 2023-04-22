import React from 'react';
import PropTypes from 'prop-types';

export default class ConcealedInputField extends React.Component {
  static propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    /* ...rest */
  };

  state = {
    editing: false,
    internalValue: this.props.value,
  };

  onChange(evt) {
    this.setState({ internalValue: evt.target.value });
  }

  onFocus() {
    this.setState({
      editing: true,
      internalValue: this.props.value,
    });
    this.props.onFocus();
  }

  onBlur() {
    if (!this.state.internalValue.includes('•')) {
      this.props.onChange(this.state.internalValue);
    }
    this.setState({ editing: false });
    this.props.onBlur();
  }

  render() {
    const { value, onChange, onFocus, onBlur, ...rest } = this.props;
    const { editing, internalValue } = this.state;
    return (
      <input
        value={editing ? internalValue : value}
        onChange={evt => this.onChange(evt)}
        onFocus={this.onFocus.bind(this)}
        onBlur={this.onBlur.bind(this)}
        {...rest}
      />
    );
  }
}
