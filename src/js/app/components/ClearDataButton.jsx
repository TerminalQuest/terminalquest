import React from 'react';
import * as jetpack from 'fs-jetpack';
import db from '../common/database';
import Store from 'electron-store';
import Button from './Button';
import config from '../config/config';
import { describeSchema } from '../common/context/schema';

function clearStoreValues() {
  const schemaDescription = describeSchema();
  const store = new Store();

  Object.entries(schemaDescription.fields).forEach(([fieldKey, field]) => {
    if (store.has(fieldKey)) {
      if (!field.meta || (field.meta && !field.meta.persistOnClearProgess)) {
        store.delete(fieldKey);
      }
    }
  })
}

export default class ClearDataButton extends React.Component {
  clearUserData() {
    if (
      !window.confirm(
        `All user data and progress will be deleted. Continue?`
      ) ||
      !window.confirm(
        `Seriously, we are about to delete all your items and re-set all your progress in the game. Are you very sure you want to do this?`
      )
    ) {
      console.log('aborting data clear...');
      return;
    }

    // Upon confirmation, delete all user data and reload the window
    console.log('clearing data...');

    // Clear data stored on disk
    clearStoreValues();

    // Delete saved user code
    jetpack.remove(config.codeStoragePath);

    // Drop IndexedDB database and reload browser window
    db.delete()
      .then(() => {
        console.log('Database successfully deleted.');
      })
      .catch(err => {
        console.error('Could not delete database');
        console.error(err);
      })
      .finally(() => {
        window.location.reload();
      });
  }

  render() {
    const clearButtonStyles = {
      fontFamily: 'Monaco, "Source Code Pro", Consolas, monospace',
      height: '48px',
    };

    return (
      <Button
        label="Erase Game Data"
        style={clearButtonStyles}
        className="fr bw3 f6 ma2"
        onClick={() => this.clearUserData()}
      />
    );
  }
}
