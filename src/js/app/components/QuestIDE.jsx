import path from 'path';
import React from 'react';
import * as jetpack from 'fs-jetpack';
import SplitterLayout from 'react-splitter-layout';
import codeRunner from '../common/code_runner';
import { getContext } from '../common/context';
import Button from './Button';
import config from '../config/config';
import { readFile } from '../common/assetLoader';

// Ace editor is present in the window scope
const ace = window.ace;

export default class QuestIDE extends React.Component {
  constructor(props) {
    super(props);
    // Will be reference to CodeMirror editor
    this.editor = null;

    // Bind event handlers
    this.consoleLog = this.consoleLog.bind(this);
    this.windowResize = this.windowResize.bind(this);

    // handle window resize events and re-render editor
    window.addEventListener('resize', () => {
      this.editor && this.editor.resize();
    });
  }

  componentDidMount() {
    this.editor = ace.edit('code-editor');
    this.editor.setTheme('ace/theme/gruvbox');
    this.editor.session.setMode('ace/mode/javascript');
    this.editor.session.setTabSize(2);
    this.editor.session.on('change', () => this.saveCode());

    // Register listeners
    window.addEventListener('resize', this.windowResize);
    codeRunner.on('log', this.consoleLog);

    // Show initialization logging and resize Ace editor to available space
    setTimeout(() => {
      this.printLn('Initializing JavaScript development environment...');
      this.printLn('QuestIDE 1.0.0 ready. Welcome, Operator.');
      this.editor.resize();
    }, 50);
  }

  componentWillUnmount() {
    // Unregister listeners
    window.removeEventListener('resize', this.windowResize);
    codeRunner.off('log', this.consoleLog);
  }

  // Helper to override the current contents of the code editor
  setCode(code) {
    this.editor.setValue(code);
    this.editor.clearSelection();
    this.editor.focus();
  }

  // Save the current contents of the editor to disk
  async saveCode() {
    if (this.savedCodePath) {
      const code = this.editor.getValue();
      await jetpack.writeAsync(this.savedCodePath, code);
    }
  }

  // Load previously saved code from disk into the editor. If there is no saved
  // code, use the example code, save that to disk, and load that into the
  // editor instead
  async loadSavedCode() {
    const savedCodeExists = await jetpack.existsAsync(this.savedCodePath);
    if (savedCodeExists) {
      const code = await jetpack.readAsync(this.savedCodePath);
      this.setCode(code);
      console.log(`Loaded code from ${this.savedCodePath}`);
    } else {
      this.loadSampleCode();
    }
  }

  // Load sample code for the current objective into the editor and
  // save it to disk.
  async loadSampleCode() {
    const sampleCode = await readFile(this.sampleCodePath);

    if (sampleCode) {
      this.setCode(sampleCode);
      console.log(`Loaded example from ${this.sampleCodePath}`);
      this.saveCode();
    } else {
      console.warn(`No sample code at ${this.sampleCodePath}`);
    }
  }

  // Handle log statements sent from the code runner
  consoleLog(logEvent) {
    logEvent.arguments.forEach(arg => {
      if (typeof arg === 'string') {
        this.printLn(arg, logEvent.logLevel);
      } else if (arg && arg.message && (arg.stack || arg.reason)) {
        // Sniff out if this looks like an error object, and print the stack
        // trace outside a JSON object
        this.printLn(arg.message, logEvent.logLevel);

        // Stack traces usually contain information about the code execution
        // window - do not include this information
        if (arg.stack) {
          const stackLines = arg.stack.split('\n');
          const newStack = [];
          for (let i = 0, l = stackLines.length; i < l; i++) {
            let line = stackLines[i];

            // Omit any further stack after a SyntaxError
            if (line.indexOf('SyntaxError') > -1) {
              break;
            }

            // Substitute out any path information about node modules
            if (line.indexOf('node_modules') > 0) {
              line = `    at ${line.split('node_modules')[1]}`;
            }
            newStack.push(line);
            if (line.indexOf('at script.js') > 0) {
              break;
            }
          }
          const newStackTrace = newStack.join('\n');
          this.printLn(newStackTrace, logEvent.logLevel);
        }
      } else if (arg) {
        this.printLn(JSON.stringify(arg, null, 2), logEvent.logLevel);
      }
    });
  }

  // Resize the browser when/if the window size changes
  windowResize() {
    this.editor && this.editor.resize();
  }

  // Append a relevant HTML
  printLn(text, style = 'stdout') {
    let output = document.getElementById('code-output');
    let s = document.createElement('span');
    s.className = style;
    s.innerText = text;
    output.append(s);
    output.scrollTop = output.scrollHeight;
  }

  // Execute code currently in the editor
  async runCode() {
    this.printLn('Executing your program...');
    await this.saveCode();
    codeRunner.runCode(
      this.editor.getValue(),
      Object.entries(getContext('env')).reduce((acc, [name, entry]) => {
        acc[name] = entry.value;
        return acc;
      }, {})
    );
  }

  // Reset saved code to the initial example code
  resetCode() {
    if (confirm('Discard your changes and reset to the sample code?')) {
      this.loadSampleCode();
    }
  }

  async onClose() {
    await this.saveCode();
    this.props.onClose();
  }

  render() {
    // Want to manage visibility rather than not render at all
    const styles = {
      display: this.props.visible ? 'block' : 'none',
    };

    const buttonStyles = {
      height: '32px',
      width: '32px',
    };

    // Set up current objective code from props
    if (this.props.objective) {
      // Set up persistent code paths for the current objective
      this.sampleCodePath = path.join(
        this.props.objective.objectivePath,
        'example.js'
      );
      this.savedCodePath = path.join(
        config.codeStoragePath,
        this.props.objective.levelName,
        this.props.objective.objectiveName,
        'user_code.js'
      );

      // Load either saved or new sample code
      this.loadSavedCode();
    }

    return (
      <div className="QuestIDE" style={styles}>
        <SplitterLayout
          vertical={true}
          percentage={true}
          secondaryInitialSize={30}
          customClassName="splitter"
          onSecondaryPaneSizeChange={() => this.editor && this.editor.resize()}
        >
          <div className="code-editor" id="code-editor" />
          <div className="console" id="console">
            <div id="code-output" />
            <div className="controls">
              <Button
                style={buttonStyles}
                onClick={() => this.runCode()}
                title="Run Code in Editor"
              >
                <i className="fas fa-play" />
              </Button>
              <Button
                style={buttonStyles}
                onClick={() => this.resetCode()}
                title="Reset to Initial Example Code"
              >
                <i className="fas fa-trash-alt" />
              </Button>
              <Button
                style={buttonStyles}
                onClick={() => this.onClose()}
                title="Hide Code Editor"
              >
                <i className="fas fa-sign-out-alt" />
              </Button>
            </div>
          </div>
        </SplitterLayout>
      </div>
    );
  }
}
