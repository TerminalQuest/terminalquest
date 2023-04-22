import React from 'react';
import PropTypes from 'prop-types';
import ga from '../../../common/analytics';
import CharacterDiagram from './CharacterDiagram';
import ItemBrowser from './ItemBrowser';

export default class Inventory extends React.Component {
  componentDidMount() {
    ga.pageview('/menu/inventory', 'Inventory Screen');
  }

  render() {
    return (
      <div className="inventory-menu flex flex-column h-100">
        <div className="flex-auto flex">
          <CharacterDiagram />
          <ItemBrowser />
        </div>
        <div className="tc pt2">
          <strong>Drag/drop</strong> or <strong>double click</strong>
          &nbsp;to equip items.
        </div>
      </div>
    );
  }
}
