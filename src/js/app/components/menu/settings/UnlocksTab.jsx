import React, { Fragment } from 'react';
import { keypress } from 'keypress.js';
import { Firestore } from '../../../common/firebase.js';
import { addItems } from '../../context_provider/itemsHelper';
import { getContext, setContext } from '../../../common/context';
import ga from '../../../common/analytics';
import AsyncInputBox from './AsyncInputBox';

function isCodeUsed(code) {
  const unlockCodes = getContext('unlockCodes');

  if (unlockCodes === null) {
    return false;
  }

  return unlockCodes.includes(code);
}

function markCodeUsed(code) {
  let unlockCodes = getContext('unlockCodes');

  if (unlockCodes === null) {
    unlockCodes = [];
  }

  setContext({ unlockCodes: [...unlockCodes, code] });
}

function getItem(itemKey) {
  const items = getContext('items');

  return items[itemKey];
}

export default class UnlocksTab extends React.Component {
  validateCode(code) {
    return new Promise(resolve => {
      if (isCodeUsed(code)) {
        return resolve({ success: false, message: 'Code already redeemed!' });
      }

      Firestore.collection('unlockCodes')
        .where('codeValue', '==', code)
        .get()
        .then(({ docs }) => {
          if (docs.length === 0) {
            // Code is not registered in Firebase
            return resolve({
              success: false,
              message: 'Invalid Code!',
            });
          }

          if (docs.length > 1) {
            console.warn(
              `More than one unlock code in Firebase matches this code, "${code}".`
            );
          }

          const [unlockCodeDoc] = docs;
          const response = unlockCodeDoc.data();

          addItems([response.unlockItemName]);
          markCodeUsed(response.codeValue);

          ga.event(
            'Promotions',
            'Unlock Code Redeemed',
            response.codeValue,
            null,
            'Settings > Unlocks',
            '/menu/settings'
          );

          const redeemedReward = getItem(response.unlockItemName).displayName;

          return resolve({
            success: true,
            message: `Redeemed: "${redeemedReward}"!`,
          });
        });
    });
  }

  render() {
    return (
      <Fragment>
        <h3>Unlock Special Items</h3>
        <p>
          Did you receive an unlock code for a special item in TerminalQuest?
          Enter the code below to add the item to your inventory!
        </p>
        <h4 className="mv2">Unlock Code</h4>
        <AsyncInputBox
          onFocus={this.props.onFocus}
          onBlur={this.props.onBlur}
          defaultButtonLabel="Redeem"
          resolvingButtonLabel="Redeeming..."
          onSubmit={this.validateCode}
        />
      </Fragment>
    );
  }
}
