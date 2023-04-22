import React from 'react';
import { remote } from 'electron';
import sharedListener from '../common/listener';
import { setContextRef, setContext, context } from '../common/context';
import HackInterface from './hack_interface/HackInterface';
import MissionComputer from './mission_computer/MissionComputer';
import HUDBar from './HUDBar';
import TitleScreen from './TitleScreen';
import Conversation from './Conversation';
import ContextProvider from './context_provider/ContextProvider';
import Menu from './menu/Menu';
import Game from './game/Game';
import OnboardingInterface from './onboarding_interface/OnboardingInterface';
import ToastMessage from './ToastMessage';
import Overlay from './Overlay';

const DEVTOOLS_WARNING = `
********************************************************************************
Danger! Wee-ooo, wee-ooo!

For real though - do NOT execute code given to you by strangers! Executing code
in this window can harm your computer. Proceed with caution, or better yet,
close this window unless you know precisely what you are doing.
********************************************************************************
`;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.contextRef = React.createRef();
    setContextRef(this.contextRef);
  }

  componentDidMount() {
    // Open dev tools when Konami code is entered
    const code = 'up up down down left right left right b a enter';
    sharedListener.sequence_combo(code, () => {
      console.warn(DEVTOOLS_WARNING);
      remote.BrowserWindow.getFocusedWindow().webContents.openDevTools();
    });
  }

  render() {
    return (
      <>
        <div className="App">
          <ContextProvider ref={this.contextRef}>
            <ContextInner />
          </ContextProvider>
        </div>
        <div>
          <div id="spector-capture-menu"></div>
          <div id="spector-result-view"></div>
        </div>
      </>
    );
  }
}

class ContextInner extends React.Component {
  static contextType = context;

  render() {
    if (!this.context.contextInitialized) {
      return null;
    }

    return (
      <>
        {this.context.showTitle && (
          <TitleScreen
            close={() => {
              setContext({
                showTitle: false,
                showOnboarding: !this.context.settings.name,
              });
            }}
          />
        )}
        {this.context.showOnboarding && (
          <OnboardingInterface
            close={() => setContext({ showOnboarding: false })}
          />
        )}
        <HackInterface />
        {this.context.showMissionComputer && (
          <MissionComputer
            close={() => setContext({ showMissionComputer: false })}
          />
        )}
        <Menu />
        <Conversation />
        <HUDBar />
        {!this.context.showTitle && !this.context.showOnboarding && <Game />}
        <ToastMessage />
        <Overlay />
      </>
    );
  }
}
