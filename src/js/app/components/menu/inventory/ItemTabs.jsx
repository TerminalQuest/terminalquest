import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default class ItemTabs extends React.Component {
  static propTypes = {
    tabs: PropTypes.array.isRequired,
    selectedTab: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  };
  static defaultProps = {};

  render() {
    const allTabClass = cx('bw1 pa2 bl bt br', {
      'bb pointer': this.props.selectedTab !== 'all',
    });

    const getTabClass = name => {
      return cx('bw1 pa2 bt br', {
        'bb pointer': this.props.selectedTab !== name,
      });
    };

    return (
      <div className="item-tabs flex flex-no-shrink ttc">
        <div
          className={allTabClass}
          onClick={this.props.onClick.bind(null, 'all')}
        >
          all
        </div>

        {this.props.tabs.map(tab => {
          return (
            <div
              className={getTabClass(tab.name)}
              onClick={this.props.onClick.bind(null, tab.name)}
              key={tab.name}
            >
              {tab.name}
            </div>
          );
        })}

        <div className="flex-auto bw1 bb" />
      </div>
    );
  }
}
