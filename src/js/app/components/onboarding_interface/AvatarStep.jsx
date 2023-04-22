import React from 'react';
import PropTypes from 'prop-types';
import { context, setContext } from '../../common/context';
import AvatarSelector from '../AvatarSelector';

export default class AvatarStep extends React.Component {
  static propTypes = {
    isActive: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    setValid: PropTypes.func.isRequired,
  };

  static contextType = context;

  updateAvatar(avatar) {
    setContext({ 'settings': { ...this.context.settings, avatar }});
  }

  componentDidMount() {
    this.props.setValid(true);
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isActive && this.props.isActive) {
      this.props.setValid(true);
    }
  }

  render() {
    return (
      <div
        className={this.props.isActive ? '' : 'o-50'}
        onClick={this.props.onClick}
      >
        <h3>Select your avatar</h3>
        <AvatarSelector
          avatar={this.context.settings.avatar}
          hotkeysEnabled={this.props.isActive}
          selectAvatar={num => this.updateAvatar(num)}
        />
      </div>
    );
  }
}
