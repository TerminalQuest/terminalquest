import path from 'path';
import { remote } from 'electron';
import isDev from 'electron-is-dev';
import bundledExtensionModules from './bundledExtensionModules.json';

const appDataPath = path.resolve(remote.app.getPath('appData'), 'TerminalQuest');
const userDataPath = path.resolve(remote.app.getPath('userData'));
const PRODUCTION_API_BASE_URL =
  'https://twilioquest-prod.firebaseapp.com/quest/';
const DEV_API_BASE_URL = 'https://twilioquest-dev.firebaseapp.com/quest/';
const saveFileName = 'config.json';

// Default configuration
let config = {
  defaultLevelName: 'fog_owl',
  defaultPlayerEntry: 'player_entry1',
  defaultMapName: 'default',
  prologueMissionStateKey: 'com.terminalquest.owls_nest',
  defaultLevelNamePrologue: 'owls_nest',
  defaultPlayerEntryPrologue: 'player_entry1',
  defaultMapNamePrologue: 'default',
  appDataPath,
  codeStoragePath: path.join(appDataPath, 'QuestIDE'),
  codeStorageFileName: 'user_code.js',
  apiBaseUrl: PRODUCTION_API_BASE_URL,
  bundledExtensionModules,
  userDataPath,
  saveFileName,
  saveFilePath: path.join(userDataPath, saveFileName),
};

// Attempt to load local config in the dev environment, if present
if (isDev) {
  try {
    const localConfig = require('./local_config');
    config = Object.assign(config, localConfig);
  } catch (e) {
    console.log('Error loading local config:');
    console.log(e);
  }

  if (config.apiBaseUrl === PRODUCTION_API_BASE_URL) {
    config.apiBaseUrl = DEV_API_BASE_URL;
  }
}

export default config;
