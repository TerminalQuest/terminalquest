import React from 'react';
import PropTypes from 'prop-types';
import { keypress } from 'keypress.js';
import { context, setContext } from '../common/context';
import { NUM_FEATURES, generateDataURI } from '../common/avatarRenderer';

const FEATURES = [
  ['sc', 'Skin'],
  ['ec', 'Eyes'],
  ['hc', 'Hair Color'],
  ['hs', 'Hair Style'],
];

export default class CustomAvatarCreator extends React.Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    hotkeysEnabled: PropTypes.bool,
  };

  static defaultProps = {
    hotkeysEnabled: true,
  };

  static contextType = context;

  state = {
    selected: 0,
  };

  componentDidMount() {
    if (!this.context.customAvatar.uri) {
      generateDataURI(this.context.customAvatar, uri => {
        setContext({ customAvatar: { ...this.context.customAvatar, uri }});
      });
    }

    this.listener = new keypress.Listener();

    this.listener.simple_combo('left', () => {
      if (this.props.hotkeysEnabled) {
        if (this.state.selected === 0) {
          this.props.close();
        } else {
          this.setState({ selected: this.state.selected - 1 });
        }
      }
    });

    this.listener.simple_combo('right', () => {
      if (this.props.hotkeysEnabled) {
        if (this.state.selected === FEATURES.length - 1) {
          return;
        } else {
          this.setState({ selected: this.state.selected + 1 });
        }
      }
    });

    this.listener.simple_combo('up', () => {
      if (this.props.hotkeysEnabled) {
        this.incrementFeature(FEATURES[this.state.selected][0]);
      }
    });

    this.listener.simple_combo('down', () => {
      if (this.props.hotkeysEnabled) {
        this.decrementFeature(FEATURES[this.state.selected][0]);
      }
    });
  }

  componentWillUnmount() {
    this.listener.destroy();
  }

  updateAvatarFeature(feature, newNum) {
    // Shallow copy custom avatar and update this feature
    const customAvatar = { ...this.context.customAvatar, [feature]: newNum };

    // Generate a new data URI for the avatar and save it & the new feature
    generateDataURI(customAvatar, uri => {
      customAvatar.uri = uri;
      setContext({ customAvatar });
    });
  }

  // Decrement feature, wrap around if needed, and udpate
  decrementFeature(key) {
    let newNum = this.context.customAvatar[key] - 1;
    if (newNum < 0) newNum = NUM_FEATURES[key] - 1;
    this.updateAvatarFeature(key, newNum);
  }

  // Increment feature, wrap around if needed, and udpate
  incrementFeature(key) {
    let newNum = this.context.customAvatar[key] + 1;
    if (newNum >= NUM_FEATURES[key]) newNum = 0;
    this.updateAvatarFeature(key, newNum);
  }

  renderPreview() {
    return (
      <div className="w4 h4 b--mid-gray ba bw2 character-avatar">
      {this.context.customAvatar.uri && (
        <img className="character-avatar-img"
          alt="Your character avatar"
          src={this.context.customAvatar.uri}
          draggable="false"
        />
      )}
      </div>
    );
  }

  renderControl([key, name], idx) {
    const classes = `w2 h2 f4 arrow pointer ba ${
      idx === this.state.selected ? 'bg-green b--white' : 'bg-dark-green b--dark-green'
    }`;

    return (
      <div
        className="w4 h4 tc flex flex-column"
        key={key}
        onClick={() => this.setState({ selected: idx })}
      >
        <div className="h2 mb3 mt3">{name}</div>
        <div className="flex justify-center">
          <div
            className={classes}
            onClick={() => this.decrementFeature(key)}
          >
            &#x25BC;
          </div>
          <div
            className={`${classes} bl-0`}
            onClick={() => this.incrementFeature(key)}
          >
            &#x25B2;
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div>
        <h4 className="mb2">Customize:</h4>
        <div className="flex flex-wrap">
          {this.renderPreview()}
          {FEATURES.map(this.renderControl, this)}
        </div>
      </div>
    );
  }
}
