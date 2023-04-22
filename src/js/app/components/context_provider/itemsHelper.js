import { getContext, setContext } from '../../common/context';
import { reduceEntries } from '../../common/utils';
const isDev = require('electron-is-dev');

export function getItemFromKey(itemKey) {
  const items = getContext('items');

  return items[itemKey];
}

export function addItems(items = []) {
  const inventory = getContext('inventory');
  const newItems = items.filter(item => !inventory.includes(item));
  setContext({ inventory: [...inventory, ...newItems] });
}

if (isDev) {
  window.addItem = item => addItems([item]);
}

export function isEquipped(item) {
  const loadout = getContext('loadout');

  function slotContains(slot) {
    return loadout[slot] === item.name;
  }

  if (item.type === 'hand' || item.type === 'accessory') {
    return slotContains(`${item.type}1`) || slotContains(`${item.type}2`);
  } else {
    return slotContains(item.type);
  }
}

export function equipItem(item, slot) {
  // Aborted drag from inventory to inventory
  if (!item && !slot) return;

  let slotToEquip = slot;
  let slotToUnequip;
  const loadout = getContext('loadout');

  if (!slotToEquip) {
    // If no slot was passed in and the item has multiple possible slots,
    // equip item in the first empty one, or if they're all full, the first
    // one. Otherwise, equip item in its only possible slot.
    if (item.type === 'hand' || item.type === 'accessory') {
      if (loadout[`${item.type}1`] && !loadout[`${item.type}2`]) {
        slotToEquip = `${item.type}2`;
      } else {
        slotToEquip = `${item.type}1`;
      }
    } else {
      slotToEquip = item.type;
    }
  } else if (
    item &&
    (slotToEquip.startsWith('hand') || slotToEquip.startsWith('accessory'))
  ) {
    // If the item could be equipped in multiple slots, it might be being
    // moved from the other one to this one. Check if the item is currently
    // in the other slot and if so, unequip it from that one.
    const otherSlot = `${slotToEquip.slice(0, -1)}${
      slotToEquip.slice(-1) === '1' ? '2' : '1'
    }`;
    const otherItemKey = loadout[otherSlot];
    if (otherItemKey === item.name) {
      slotToUnequip = otherSlot;
    }
  }

  if (slotToUnequip) {
    setContext({
      loadout: {
        ...loadout,
        [slotToEquip]: item.name,
        [slotToUnequip]: null,
      },
    });
  } else {
    setContext({
      loadout: {
        ...loadout,
        [slotToEquip]: item ? item.name : null,
      },
    });
  }
}

export function populateLoadoutWithItems(loadout) {
  const loadoutEntries = Object.entries(loadout);
  const populatedLoadoutEntries = loadoutEntries.map(([slotName, itemKey]) => {
    return [slotName, getItemFromKey(itemKey)];
  });
  const populatedLoadout = reduceEntries(populatedLoadoutEntries);

  return populatedLoadout;
}
