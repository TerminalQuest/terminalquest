import React from 'react';
import * as jetpack from 'fs-jetpack';
import { keypress } from 'keypress.js';
import ga from '../../common/analytics';
import { staticFilePath } from '../../common/fs_utils';
import Listener from '../../common/listener';
import { setContext, context, emitter } from '../../common/context';
import codeRunner from '../../common/code_runner';
import audioManager from '../../common/audio/index';
import MenuContainer from '../MenuContainer';
import ObjectiveDescription from './objective_description/ObjectiveDescription';
import Validator from './validator/Validator';
import { readFile } from '../../common/assetLoader';
import levelLoader, { OBJECTIVE_FILE_NAME } from '../../common/levelLoader';
import path from 'path';
import QuestIDE from '../QuestIDE';

export default class HackInterface extends React.Component {
  static contextType = context;

  state = {
    objective: null,
    ideVisible: false,
    cleared: false,
    newEnvVars: [],
  };

  prevHackObject = null;

  componentDidMount() {
    // Set up a listener for the escape key to close the hack interface
    this.keypressListener = new keypress.Listener();
    this.keypressListener.simple_combo('esc', () => this.close());
    // Initially, turn off until an objective has been loaded
    this.keypressListener.stop_listening();

    // Listen for a hackable object being selected from the game world
    emitter.on('levelLifecycle', e => {
      if (
        e.name === 'objectiveCompleted' ||
        e.name === 'objectiveCompletedAgain'
      ) {
        this.setState({ ideVisible: false });
      }
    });
  }

  componentDidUpdate() {
    // Toggle whether or not the keypress listener should be active
    if (this.state.ideVisible || !this.state.hackObject) {
      this.keypressListener.stop_listening();
    } else {
      this.keypressListener.listen();
    }

    // Load a new objective if needed
    const { hackObject } = this.context;
    if (hackObject && hackObject !== this.prevHackObject) {
      this.prevHackObject = hackObject;
      this.loadObjective(hackObject);
    }
  }

  // Configure component from hackable object
  async loadObjective(hackObject) {
    // This is too jarring without some kind of transition. Commenting for now
    // audioManager.music.play('hackertheme_104771b');
    audioManager.music.setMaxVolumeAll(0.05, false);

    const objectivePath = path.join(
      levelLoader.getObjectivesDirPath(hackObject.level.levelName),
      hackObject.objectiveName
    );
    const objectiveInfoPath = path.join(objectivePath, OBJECTIVE_FILE_NAME);
    const objectiveConfig = await readFile(objectiveInfoPath);

    if (!objectiveConfig) {
      throw new Error(`
        Tried to open an objective that didn\'t exist!
      
        Level: ${hackObject.level.levelName}
        Objective: ${hackObject.objectiveName}
        Path: ${objectiveInfoPath}
      `);
    }

    let objective = JSON.parse(objectiveConfig);
    objective.objectivePath = objectivePath;
    objective.objectiveName = hackObject.objectiveName;
    objective.levelName = hackObject.level.levelName;

    // Pause global hotkeys in hack interface, listen for our hotkeys
    Listener.stop_listening();
    this.keypressListener.listen();

    // Update React component state for re-render
    this.setState(
      {
        objective,
        code: null,
        ideVisible: false,
      },
      () => {
        emitter.emit('levelLifecycle', {
          name: 'objectiveDidOpen',
          target: hackObject,
        });
      }
    );

    // Send Google analytics "page view" event
    ga.pageview(
      `/levels/${hackObject.level.levelName}/${hackObject.objectiveName}`,
      `${objective.title}`
    );
  }

  // Load up the Quest IDE from objective configuration
  toggleEditor() {
    if (!this.state.ideVisible) {
      // Register event for code execution
      ga.event(
        'IDE',
        'Launch IDE',
        `IDE Launch: ${this.state.objective.title}`
      );
    }

    this.setState({ ideVisible: !this.state.ideVisible });
  }

  // On close, clear context and do some clean up
  close() {
    setContext({ hackObject: null });

    audioManager.music.setMaxVolumeAll(1.0);
    codeRunner.terminate();
    this.setState({ objective: null, cleared: false });
    Listener.listen();

    emitter.emit('levelLifecycle', {
      name: 'objectiveDidClose',
      target: this.prevHackObject,
    });

    this.prevHackObject = null;
  }

  render() {
    if (!this.state.objective) return null;

    return (
      <div className="HackInterface">
        <MenuContainer
          title={this.state.objective.title}
          onClose={() => this.close()}
        >
          <div className="hack-inner">
            <ObjectiveDescription
              objective={this.state.objective}
              cleared={this.state.cleared}
              newEnvVars={this.state.newEnvVars}
            />
            <Validator
              hackObject={this.context.hackObject}
              objective={this.state.objective}
              ideVisible={this.state.ideVisible}
              launchIde={() => this.toggleEditor()}
              onDone={() => this.close()}
              onSuccess={newEnvVars =>
                this.setState({ cleared: true, newEnvVars })
              }
              onReset={() => this.setState({ cleared: false })}
            />
            <QuestIDE
              objective={this.state.objective}
              visible={this.state.ideVisible}
              onClose={() => this.setState({ ideVisible: false })}
            />
          </div>
        </MenuContainer>
      </div>
    );
  }
}
