import React from 'react';
import PropTypes from 'prop-types';
import { keypress } from 'keypress.js';
import cx from 'classnames';
import CustomAvatarCreator from './CustomAvatarCreator';
import { staticFileUrl } from '../common/fs_utils';
import { NUM_AVATARS } from '../common/context/schema';

export default class AvatarSelector extends React.Component {
  static propTypes = {
    avatar: PropTypes.number.isRequired,
    hotkeysEnabled: PropTypes.bool,
    selectAvatar: PropTypes.func.isRequired,
  };

  static defaultProps = {
    hotkeysEnabled: true,
  };

  componentDidMount() {
    this.listener = new keypress.Listener();
    this.listener.simple_combo('left', () => this.onArrowKeyPress('left'));
    this.listener.simple_combo('right', () => this.onArrowKeyPress('right'));
  }

  componentWillUnmount() {
    this.listener.destroy();
  }

  onArrowKeyPress(dir) {
    if (this.props.hotkeysEnabled && this.props.avatar !== 0) {
      let num = this.props.avatar;
      if (dir === 'left' && this.props.avatar > 1) {
        num--;
      } else if (dir === 'right') {
        if (this.props.avatar < NUM_AVATARS) {
          num++;
        } else {
          num = 0;
        }
      }
      this.props.selectAvatar(num);
    } else {
      return true;
    }
  }

  renderAvatar(number) {
    const classes = cx('w4 h4 tc character-avatar', {
      'b--green ba bw2': number === this.props.avatar,
      'pointer pa1': number !== this.props.avatar,
    });

    let contents;

    if (number) {
      contents = (
        <img className="character-avatar-img"
          alt="Your character avatar"
          src={staticFileUrl(`avatars/avatar${number}.png`)}
          draggable="false"
        />
      );
    } else {
      contents = (
        <div className="pt3">
          <h1>?</h1>
          Custom
        </div>
      );
    }

    return (
      <div
        className={classes}
        key={number}
        onClick={() => this.props.selectAvatar(number)}
      >
        {contents}
      </div>
    );
  }

  render() {
    return (
      <div className="AvatarSelector">
        <div className="flex flex-wrap">
          {[...Array(NUM_AVATARS).keys()].map(n => this.renderAvatar(n + 1))}
          {this.renderAvatar(0)}
        </div>

        {this.props.avatar === 0 && (
          <CustomAvatarCreator
            close={() => this.props.selectAvatar(NUM_AVATARS)}
            hotkeysEnabled={this.props.hotkeysEnabled}
          />
        )}
      </div>
    );
  }
}
