import React from 'react';
import PropTypes from 'prop-types';
import ItemPopover from '../../ItemPopover';
import { setContext } from '../../../common/context';
import { equipItem } from '../../context_provider/itemsHelper';

export default class Items extends React.Component {
  static propTypes = {
    items: PropTypes.array.isRequired,
    onDragStart: PropTypes.func.isRequired,
    onDragEnd: PropTypes.func.isRequired,
    dragItem: PropTypes.string,
  };

  onDragOver(evt) {
    evt.preventDefault();
  }

  onDrop(evt) {
    evt.preventDefault();
    const { slotName } = JSON.parse(evt.dataTransfer.getData('text/plain'));
    equipItem(null, slotName);
    setContext({ dragItem: null });
  }

  onClick(itemName, evt) {
    setContext({
      dragItem: this.props.dragItem === itemName ? null : itemName,
    });
    evt.stopPropagation();
  }

  renderItem(item) {
    const { dragItem } = this.props;

    return (
      <div
        key={item.name}
        className="item-browser-item h4 tc lh-copy pointer"
        draggable="true"
        onDragStart={evt => this.props.onDragStart(item, evt)}
        onDragEnd={this.props.onDragEnd}
        onClick={this.onClick.bind(this, item.name)}
        onDoubleClick={() => {
          setContext({ dragItem: null });
          equipItem(item);
        }}
      >
        <ItemPopover item={item} isSelected={item.name === dragItem}>
          <img
            style={{ imageRendering: 'pixelated' }}
            className="h3 mb1"
            draggable="false"
            src={item.iconPath}
            alt={item.name}
          />
          <div>{item.displayName}</div>
        </ItemPopover>
      </div>
    );
  }

  render() {
    return (
      <div
        className="items f6 pa3 bw1 bl bb br flex flex-wrap flex-auto overflow-scroll"
        onDragOver={this.onDragOver.bind(this)}
        onDrop={this.onDrop.bind(this)}
      >
        {this.props.items.map(item => this.renderItem(item))}
      </div>
    );
  }
}
