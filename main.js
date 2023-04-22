/*
This file is used during development to load an electron window in the same way
as the launcher app would - it's not a perfect recreation, but probably good
enough for dev.
*/
const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');

// Configure a bare-bones right click context menu
require('electron-context-menu')();

// Reference to main launcher window
let mainWindow;

function createWindow() {
  if (isDev) {
    // Install React dev tools on launch in dev
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS
    } = require('electron-devtools-installer');

    installExtension(REACT_DEVELOPER_TOOLS).then(name => {
      console.log(`Added Extension: ${name}`);
    }).catch(err => {
      console.log('An error occurred: ', err);
    });
  }

  mainWindow = new BrowserWindow({
    title: 'TerminalQuest',
    backgroundColor: '#232323',
    height: 800,
    width: 1280,
    minWidth: 1024,
    minHeight: 576,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
  mainWindow.loadFile('public/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Dereference the window after close
  mainWindow.on('closed', () => {
    mainWindow = null;
    process.exit(0);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});
