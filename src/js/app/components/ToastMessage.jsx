import React, { Component } from 'react';
import { emitter } from '../common/context';

export default class ToastMessage extends Component {
  state = {
    show: false,
    message: '',
    currentTimeout: undefined,
    animation: '',
  };

  componentDidMount() {
    emitter.on('contextUpdate:toastMessage', message => {
      const { currentTimeout } = this.state;

      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }

      const newTimeout = setTimeout(() => {
        // Auto hide if needed after 8 seconds
        if (this.state.animation !== 'slideOutDown') {
          this.hide();
        }
      }, 8000);

      this.setState({
        message,
        currentTimeout: newTimeout,
        show: true,
        animation: 'slideInUp',
      });
    });
  }

  hide() {
    this.setState({
      animation: 'slideOutDown',
    });
  }

  onAnimationEnd() {
    const { animation } = this.state;

    if (animation === 'slideInUp') {
      this.setState({
        animation: '',
      });
    }

    if (animation === 'slideOutDown') {
      this.setState({
        animation: '',
        show: false,
        message: '',
      });
    }
  }

  render() {
    const { show, animation, message } = this.state;

    return (
      show && (
        <div className="absolute bottom-0 w-100">
          <p
            className={`ToastMessage w-two-thirds center ${animation}`}
            onAnimationEnd={() => this.onAnimationEnd()}>
            <img className="operator"
              alt="Operator Silhouette" src="images/app/operator.png"/>
            <img className="close"
              alt="Close" src="images/app/menu/close.png"
              onClick={() => this.hide() }/>
            <span className="content"
              dangerouslySetInnerHTML={{ __html: message }}></span>
          </p>
        </div>

      )
    );
  }
}
