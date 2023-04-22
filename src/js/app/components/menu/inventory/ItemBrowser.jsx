import React from 'react';
import PropTypes from 'prop-types';
import ItemTabs from './ItemTabs';
import Items from './Items';
import { context, setContext } from '../../../common/context';
import { isEquipped } from '../../context_provider/itemsHelper';

const slotFixtures = [
  { name: 'hand' },
  { name: 'head' },
  { name: 'body' },
  { name: 'legs' },
  { name: 'feet' },
  { name: 'accessory' },
];

export default class ItemBrowser extends React.Component {
  static contextType = context;

  state = {
    selectedTab: 'all',
  };

  onTabClick(tabName) {
    this.setState({
      selectedTab: tabName,
    });
  }

  startItemDrag(item, evt) {
    evt.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ itemName: item.name })
    );
    setContext({ dragItem: item.name });

    const dragImage = new Image();
    dragImage.src = item.iconPath;
    evt.dataTransfer.setDragImage(dragImage, 32, 32);
  }

  endItemDrag(evt) {
    setContext({ dragItem: null });
  }

  filteredItems() {
    // Process inventory and return result
    return (
      this.context.inventory

        // Translate item names into item objects
        .map(name => this.context.items[name])

        // Filter out empty items and ones that shouldn't be shown on this tab
        .filter(item => {
          if (!item) return false;
          return (
            (this.state.selectedTab === 'all' ||
              this.state.selectedTab === item.type) &&
            !isEquipped(item)
          );
        })

        // Sort items by type and then name
        .sort((a, b) => {
          if (a.type < b.type) {
            return -1;
          }
          if (a.type > b.type) {
            return 1;
          }
          if (a.displayName < b.displayName) {
            return -1;
          }
          if (a.displayName > b.displayName) {
            return 1;
          }
          return 0;
        })
    );
  }

  render() {
    return (
      <div
        className="item-browser w-70 flex flex-column"
        onClick={this.endItemDrag.bind(this)}
      >
        <ItemTabs
          tabs={slotFixtures}
          selectedTab={this.state.selectedTab}
          onClick={this.onTabClick.bind(this)}
        />
        <Items
          items={this.filteredItems()}
          onDragStart={this.startItemDrag.bind(this)}
          onDragEnd={this.endItemDrag.bind(this)}
          dragItem={this.context.dragItem}
        />
      </div>
    );
  }
}
