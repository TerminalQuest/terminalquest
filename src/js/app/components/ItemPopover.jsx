import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'react-tiny-popover';
const { setTimeout, clearTimeout } = window;

export default class ItemPopover extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
    isSelected: PropTypes.bool,
  };

  static defaultProps = {
    isSelected: false,
  };

  state = {
    isHover: false,
  };

  componentWillUnmount() {
    this.onLeave();
  }

  onEnter() {
    this.timeout = setTimeout(() => {
      this.setState({ isHover: true });
    }, 500);
  }

  onLeave() {
    clearTimeout(this.timeout);
    this.setState({ isHover: false });
  }

  render() {
    const { item, isSelected, children } = this.props;
    const { isHover } = this.state;

    return (
      <Popover
        isOpen={isHover}
        containerClassName="ItemPopover bg-light-gray black"
        position="bottom"
        align="start"
        transitionDuration={0.01}
        content={
          <div>
            <div className="fl w3 h3 ma1 relative avatar">
              <img className="absolute" src="avatars/parts/body.png" />
              <img className="absolute" src={item.layerPath} />
            </div>
            <h4 className="ma0">{item.displayName}</h4>
            <p className="mb0 item-description"
              dangerouslySetInnerHTML={{ __html: item.description }}>
            </p>
          </div>
        }
      >
        <div
          onMouseEnter={this.onEnter.bind(this)}
          onMouseLeave={this.onLeave.bind(this)}
          className={isSelected ? 'ba bw2 b--green' : 'pa1'}
        >
          {children}
        </div>
      </Popover>
    );
  }
}
