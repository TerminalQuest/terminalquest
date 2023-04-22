import React from 'react';
import Store from 'electron-store';
import EventEmitter from 'events';
import {
  stripIndents
} from 'common-tags';
import {
  validateContextUpdate,
  reduceEntries,
  describeSchema
} from './schema';
import {
  syncContext
} from './sync';

export const context = React.createContext({});
export const emitter = new EventEmitter();
const store = new Store();
let contextRef;

export function getSavedFields() {
  const schemaDescription = describeSchema();

  return Object.entries(schemaDescription.fields)
    .filter(([, field]) => field.meta && field.meta.saveToDisk)
    .map(([fieldKey]) => fieldKey);
}

// Used only once during application startup, to store a reference to the
// specific instance of the Context component being used.
export function setContextRef(ref) {
  contextRef = ref;
}

export function getContext(key) {
  if (!key) {
    return contextRef.current.state;
  }

  return contextRef.current.state[key];
}

// Takes an object of key-value pairs to be merged into context (like setState)
export function setContext(newContext) {
  const validationResults = validateContextUpdate(newContext);

  const isValidUpdate = validationResults.every(result => result.valid);

  if (!isValidUpdate) {
    console.warn(
      stripIndents `
      Skipping context update: context updates did not match schema. See earlier errors for more information.
      
      Attempted context update:
      `,
      newContext
    );
    return;
  }

  // Recombine the validation results into a React formatted
  // state update slice.
  const validatedNewContext = reduceEntries(
    validationResults.map(({
      key,
      update
    }) => [key, update])
  );

  // Merge new properties into the state of the Context component
  contextRef.current.setState(validatedNewContext, () => {
    // Once state change has been committed, emit events: one for all changes
    // together and one each per individual key. Also, save any necessary
    // fields to disk.
    emitter.emit('contextUpdate', validatedNewContext);
    Object.entries(validatedNewContext).forEach(([key, value]) => {
      emitter.emit(`contextUpdate:${key}`, value);
      if (getSavedFields().includes(key)) store.set(key, value);
    });

    syncContext(validatedNewContext);
  });

}

window.setContext = setContext;