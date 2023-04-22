import React, { Fragment } from 'react';
import AsyncInputBox from './AsyncInputBox';
import { joinTeam, getJoinedTeams, disconnectTeam } from '../../../common/teams';

export class JoinTeam extends React.Component {
  render() {
    const { enableSubmitHotkey, onSuccess = () => {} } = this.props;
    return (
      <AsyncInputBox
        onFocus={this.props.onFocus}
        onBlur={this.props.onBlur}
        defaultButtonLabel="Join"
        resolvingButtonLabel="Joining..."
        onSubmit={joinTeam}
        onSuccess={onSuccess}
        enableSubmitHotkey={enableSubmitHotkey}
      />
    );
  }
}

export class CurrentTeam extends React.Component {
  render() {
    const teams = getJoinedTeams();
    
    return (
      <>
        <h4 className="mt4">Current Team(s)</h4>
        {teams ? 
          teams.map(
            team => (
            <Fragment key={team.id}>
              <h5 className="mv2">{team.displayName}</h5>
              <div className={`mb3 red`}>
                <span className={`pb1 bb b--red pointer`}
                    onClick={() => disconnectTeam(team)}>
                  Leave Team
                </span>
              </div>
            </Fragment>
          )
          ) : (
          <p>You're not on a team right now.</p>
        )}
      </>
    );
  }
}
