import EventEmitter from 'events';
import * as jetpack from 'fs-jetpack';
import { staticFilePath } from './fs_utils';

// Necessary electron goodies
const { ipcRenderer, remote } = require('electron');
const { app, BrowserWindow } = remote;

// Paths for code execution
const basePath = `${app.getPath('userData')}/QuestIDE`;
const appCodePath = `${basePath}/script.js`;

// Run IDE code in an invisible browser window instance
class CodeRunner extends EventEmitter {
  constructor() {
    super();

    // On init, destroy all other CodeRunner BrowserWindows
    BrowserWindow.getAllWindows().forEach(window => {
      const windowUrl = window.webContents.getURL();
      if (!window.isVisible() && windowUrl.endsWith('runner.html')) {
        window.close();
      }
    });

    this.env = null;
    this.codeWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
      },
      // Specifying the current window as the parent ensures it is closed
      // and cleaned up when the game window closes
      parent: remote.getCurrentWindow(),
    });
    this.codeWindow.loadFile(staticFilePath('code_runner/runner.html'));

    // When the window loads, send an IPC message with any current environment
    // variables from a recent code execution
    this.codeWindow.webContents.on('did-finish-load', () => {
      // On the first load, env will be null, so no code will be executed
      this.codeWindow.webContents.send('runWithEnv', {
        env: this.env,
        appCodePath,
      });
    });

    // Listen for IPC events that will be broadcast by the code runner window
    ipcRenderer.on('code_runner:log', (event, payload) => {
      this.emit('log', payload);
    });
  }

  // Exceute the given code in an invisible Electron window
  runCode(code, env) {
    // Save current environment info as an instance var
    this.env = env;

    const self = this;
    (async function() {
      try {
        // Write the latest code out to disk
        await jetpack.writeAsync(appCodePath, code);

        // Reload the invisible code runner window, which should make it try to
        // load and run the code again
        self.codeWindow.webContents.reload();
      } catch (e) {
        console.error('Code runner execution error:');
        console.error(e);
        self.emit('console.error', e.message);
      }
    })();
  }

  // Terminate any running code by reloading the code runner window with dummy
  // code on disk
  terminate() {
    this.runCode('console.log("Terminated.")', {});
  }
}

// Export a singleton
const codeRunnerInstance = new CodeRunner();
export default codeRunnerInstance;
