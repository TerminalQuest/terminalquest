import React from 'react';
import PropTypes from 'prop-types';
import { context } from '../common/context';
import { getItemFromKey } from './context_provider/itemsHelper';

const RENDER_ORDER = [
  'body',
  'head',
  'legs',
  'feet',
  'hand1',
  'hand2',
  'accessory1',
  'accessory2',
];

export default class CharacterAvatar extends React.Component {
  static propTypes = {
    className: PropTypes.string,
  };

  static contextType = context;

  getPremadeAvatarURI() {
    return `avatars/avatar${this.context.settings.avatar}.png`;
  }

  renderItem(slotName) {
    const itemKey = this.context.loadout[slotName];

    if (!itemKey) return null;

    const item = getItemFromKey(itemKey);

    return (
      <img
        alt=""
        src={slotName === 'hand2' ? item.layerReversePath : item.layerPath}
        className="absolute left-0"
        key={slotName}
        draggable="false"
      />
    );
  }

  render() {
    return (
      <div className={this.props.className}>
        <div className="relative character-avatar">
          <img
            className="character-avatar-img"
            alt="Your character avatar"
            src={
              this.context.settings.avatar === 0
                ? this.context.customAvatar.uri
                : this.getPremadeAvatarURI()
            }
            draggable="false"
          />
          {RENDER_ORDER.map(slotName => this.renderItem(slotName))}
        </div>
      </div>
    );
  }
}
