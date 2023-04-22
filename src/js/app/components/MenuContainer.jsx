import React from 'react';
import PropTypes from 'prop-types';
import sharedListener from '../common/listener';

export default class MenuContainer extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    onClose: PropTypes.func,
    showCloseButton: PropTypes.bool,
  };

  static defaultProps = {
    title: '',
    onClose: () => {},
    showCloseButton: true,
  };

  componentDidMount() {
    // Set up hotkey for exit after component mounts
    this.listener = sharedListener.simple_combo('esc', () =>
      this.props.onClose()
    );
  }

  componentWillUnmount() {
    // Tear down exit hotkey
    sharedListener.unregister_combo(this.listener);
  }

  render() {
    return (
      <div className="MenuContainer">
        <div className="frosty" onClick={() => this.props.onClose()} />
        <div className="computer-inner">
          <div className="tl" />
          <div className="tm" />
          <div className={this.props.showCloseButton ? 'tr' : 'tr-alt'} />
          <div className="r" />
          <div className="l" />
          <div className="botl" />
          <div className="bm" />
          <div className="botr" />
          <div className="computer-bg">
            <h2 className="window-title">{this.props.title}</h2>
            {this.props.children}
          </div>
          {this.props.showCloseButton && (
            <div className="close" onClick={() => this.props.onClose()}>
              &nbsp;
            </div>
          )}
        </div>
      </div>
    );
  }
}
