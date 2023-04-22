import React from 'react';
import ga from '../../common/analytics';

export default class Help extends React.Component {
  componentDidMount() {
    ga.pageview('/menu/help', 'Help Screen');
  }

  render() {
    return (
      <div className="Help pv3">
        <h2>Help</h2>

        <h4>Movement</h4>
        <p>
          Move your player with the <strong>arrow keys</strong> or
          the <strong>[W], [A], [S], and [D]</strong> keys.
        </p>
        <p>
          Interact with people or objects using the <strong>spacebar</strong>.
        </p>

        <h4>Technical Assistance</h4>
        <p>
          Need help on a particular code challenge, or other technical
          assistance? Chat with your fellow Operators in our <a href="https://twil.io/tq-discord">Discord server</a>.
        </p>
      </div>
    );
  }
}
