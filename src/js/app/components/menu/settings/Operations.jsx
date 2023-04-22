import React, { Fragment } from 'react';
import AsyncInputBox from './AsyncInputBox';
import { joinOperation, getJoinedOperations, disconnectOperation } from '../../../common/operations';

export class JoinOperation extends React.Component {
  render() {
    const { enableSubmitHotkey, onSuccess = () => {} } = this.props;

    return (
      <AsyncInputBox
        onFocus={this.props.onFocus}
        onBlur={this.props.onBlur}
        defaultButtonLabel="Join"
        resolvingButtonLabel="Joining..."
        onSubmit={joinOperation}
        onSuccess={onSuccess}
        enableSubmitHotkey={enableSubmitHotkey}
      />
    );
  }
}

export class CurrentOperation extends React.Component {
  render() {
    const operations = getJoinedOperations();
    
    return (
      <>
        <h4 className="mt4">Current Operation(s)</h4>
        {operations ? 
          operations.map(
            operation => (
            <Fragment key={operation.id}>
              <h5 className="mv2">{operation.displayName}</h5>
              <div className={`mb3 red`}>
                <span className={`pb1 bb b--red pointer`} 
                  onClick={() => disconnectOperation(operation)}>
                    Leave Operation
                </span>
              </div>
            </Fragment>
          )
          ) : (
          <p>You're not in any operations right now.</p>
        )}
      </>
    );
  }
}
