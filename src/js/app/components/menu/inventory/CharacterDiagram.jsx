import React from 'react';
import PropTypes from 'prop-types';
import ItemPopover from '../../ItemPopover';
import CharacterAvatar from '../../CharacterAvatar';
import cx from 'classnames';
import { context, setContext } from '../../../common/context';
import { equipItem, getItemFromKey } from '../../context_provider/itemsHelper';

export default class CharacterDiagram extends React.Component {
  static contextType = context;

  onDragOver(slotName, evt) {
    evt.preventDefault();
    const dragItemObj = this.context.items[this.context.dragItem];
    if (!this.canEquip(slotName, dragItemObj && dragItemObj.type)) {
      evt.dataTransfer.dropEffect = 'none';
    }
  }

  onDrop(slotName, evt) {
    evt.preventDefault();
    const { itemName } = JSON.parse(evt.dataTransfer.getData('text/plain'));
    equipItem(this.context.items[itemName], slotName);
    setContext({ dragItem: null });
  }

  onClick(slotName) {
    const dragItemObj = this.context.items[this.context.dragItem];
    if (dragItemObj && this.canEquip(slotName, dragItemObj.type)) {
      equipItem(dragItemObj, slotName);
      setContext({ dragItem: null });
    }
  }

  onDoubleClick(slotName, evt) {
    evt.preventDefault();
    equipItem(null, slotName);
  }

  canEquip(slotName, itemType) {
    return slotName.startsWith(itemType);
  }

  onDragStart(itemName, slotName, evt) {
    setContext({ dragItem: itemName });
    evt.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ itemName, slotName })
    );
  }

  onDragEnd() {
    setContext({ dragItem: null });
  }

  renderSlot(slotName, className) {
    const equippedItemKey = this.context.loadout[slotName];
    const equippedItem = getItemFromKey(equippedItemKey);

    const dragItemObj = this.context.items[this.context.dragItem];
    const type = dragItemObj && dragItemObj.type;
    const classes = cx('ba bw1 w3 h3 mb1 bg-black-30', {
      pointer: equippedItem,
      'b--green pointer-plus': type && this.canEquip(slotName, type),
      'b--mid-gray': type && !this.canEquip(slotName, type),
    });

    return (
      <div className={cx('f6 ttc', className)}>
        <div
          className={classes}
          onDragOver={this.onDragOver.bind(this, slotName)}
          onDrop={this.onDrop.bind(this, slotName)}
          onClick={this.onClick.bind(this, slotName)}
          onDoubleClick={this.onDoubleClick.bind(this, slotName)}
        >
          {equippedItem && (
            <ItemPopover item={equippedItem}>
              <img
                style={{ width: '100%', imageRendering: 'pixelated' }}
                src={equippedItem.iconPath}
                alt={equippedItem.name}
                draggable="true"
                onDragStart={this.onDragStart.bind(
                  this,
                  equippedItem.name,
                  slotName
                )}
                onDragEnd={this.onDragEnd.bind(this)}
              />
            </ItemPopover>
          )}
        </div>
        {slotName.slice(0, 4)}
      </div>
    );
  }

  render() {
    return (
      <div className="w-30 bw1 ba mr3 pa3 tc pt6 pt3-l relative character-diagram">
        <div className="flex justify-center mb2">
          {this.renderSlot('head', 'mr3')}
          {this.renderSlot('body')}
        </div>
        <div className="flex items-center justify-center mb2">
          <div className="flex flex-column mr3 mr0-l">
            {this.renderSlot('hand1', 'mb3')}
            {this.renderSlot('accessory1')}
          </div>
          <CharacterAvatar className="absolute w3 w-auto-l top-2 static-l" />
          <div className="flex flex-column">
            {this.renderSlot('hand2', 'mb3')}
            {this.renderSlot('accessory2')}
          </div>
        </div>
        <div className="flex justify-center mb4">
          {this.renderSlot('legs', 'mr3')}
          {this.renderSlot('feet')}
        </div>
      </div>
    );
  }
}
