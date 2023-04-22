import path from 'path';
import PropTypes from 'prop-types';
import React from 'react';
import { Converter } from 'showdown';
import { keypress } from 'keypress.js';
import ga from '../../../common/analytics';
import gameEvents from '../../../common/gameEvents';
import { context, setContext, emitter } from '../../../common/context';
import { Firestore } from '../../../common/firebase';
import {
  addItems,
  populateLoadoutWithItems,
} from '../../context_provider/itemsHelper';
import Button from '../../Button';
import ValidationHelper from './ValidationHelper';
import levelLoader from '../../../common/levelLoader';
import { requireFromExtension } from '../../../common/assetLoader';
import World from '../../../common/world';
import CopyDebugInfoButton from './CobyDebugInfoButton';

const MD = new Converter({
  openLinksInNewWindow: true,
});
MD.setFlavor('vanilla');

const STATUS = {
  INITIALIZING: '** ANALYZING **',
  LOCKED: '** LOCKED **',
  HACKING: '** HACKING **',
  CLEAR: '** CLEAR **',
  SUCCESS: '** SUCCESS **',
  FAIL: '** FAILED **',
};

// NOTE: window.require must be used to "fool" webpack and just use
// the unmodified Electron "require"
const _require = window.require;

export default class Validator extends React.Component {
  static propTypes = {
    hackObject: PropTypes.object,
    objective: PropTypes.object,
    ideVisible: PropTypes.bool,
    launchIde: PropTypes.func,
    onDone: PropTypes.func,
    onSuccess: PropTypes.func,
    onReset: PropTypes.func,
  };

  static contextType = context;

  state = {
    clear: false,
    statusColor: 'blue',
    statusReadout: STATUS.INITIALIZING,
    disabled: false,
    validationFields: {},
    feedback: '',
    copiedObjectiveDebugInfo: false,
  };

  constructor(props) {
    super(props);

    // Set up a listener for the enter key
    this.keypressListener = new keypress.Listener();
    this.keypressListener.simple_combo('enter', () => {
      this.validate();
    });
    // Initially, turn off until an objective has been loaded
    this.keypressListener.stop_listening();
  }

  componentDidMount() {
    let complete = this.props.hackObject.complete;
    this.setState({
      clear: complete ? true : false,
      statusColor: complete ? 'blue' : 'red',
      statusReadout: complete ? STATUS.CLEAR : STATUS.LOCKED,
      copiedObjectiveDebugInfo: false,
    });
    this.store = firebase.firestore();
    window.completeCurrentObjective = () => {
      if (!this.props.hackObject.complete) {
        this.completeObjective();
      } else {
        console.log(
          `This objective, ${this.props.hackObject.level.levelName}/${this.props.hackObject.objectiveName}, has already been completed!`
        );
      }
    };

    window.removeCurrentObjective = () => {
      if (this.props.hackObject.complete) {
        this.removeObjective();
      } else {
        console.log(
          `This objective, ${this.props.hackObject.level.levelName}/${this.props.hackObject.objectiveName}, has not been completed yet!`
        );
      }
    };
  }

  componentWillUnmount() {
    this.keypressListener.stop_listening();
  }

  validationFieldFocus() {
    // If the validation fields receive focus, the enter key should be usable
    this.keypressListener.listen();
  }

  validationFieldBlur() {
    // If the validation fields are not focused, don't listen for enter
    this.keypressListener.stop_listening();
  }

  async validate() {
    if (this.state.disabled) {
      return;
    }

    this.setState({
      statusColor: 'blue',
      statusReadout: STATUS.HACKING,
      disabled: true,
      copiedObjectiveDebugInfo: false,
    });

    this.keypressListener.stop_listening();

    // Moved out of setState callback because of bug with updating environment
    // variables - something goofy happening with Context. Keep this in a timer
    // for now.
    setTimeout(async () => {
      const modulePath = path.join(
        this.props.objective.objectivePath,
        'validator.js'
      );
      const validate = await requireFromExtension(modulePath);

      // Set up validation context
      const validationContext = {
        validationFields: this.state.validationFields,

        // Marshall environment variables for validation
        env: Object.keys(this.context.env).reduce((acc, key) => {
          acc[key] = this.context.env[key].value;
          return acc;
        }, {}),

        // Pass in global context
        context: this.context,
      };

      // Set up a validation callback
      const validationCallback = (err, feedback) => {
        if (err) {
          ga.event(
            'Hacking',
            'Hack Attempt Failed',
            this.props.objective.title,
            null,
            this.props.objective.title,
            `/levels/${this.props.hackObject.level.levelName}/${this.props.hackObject.objectiveName}`
          );
        } else {
          ga.event(
            'Hacking',
            'Hack Attempt Success',
            this.props.objective.title,
            null,
            this.props.objective.title,
            `/levels/${this.props.hackObject.level.levelName}/${this.props.hackObject.objectiveName}`
          );
        }
        this.processValidationFeedback(err, feedback);
      };

      // Set up validation helper
      const helper = new ValidationHelper(
        validationContext,
        validationCallback,
        this.props.hackObject.level
      );

      // Attempt configured validation
      validate(helper, helper.validationCallback);
    }, 300);
  }

  // Process validation feedback
  processValidationFeedback(err, feedback) {
    // Update hack interface state based on validation run
    this.setState({
      statusColor: err ? 'red' : 'green',
      statusReadout: err ? STATUS.FAIL : STATUS.SUCCESS,
      disabled: false,
      feedback: err ? err.message : feedback.message,
    });

    if (feedback && feedback.env) {
      feedback.env.forEach(({ name, ...rest }) => {
        const key = `${name.startsWith('TQ_') ? '' : 'TQ_'}${name}`;
        setContext({ env: { ...this.context.env, [key]: rest } });
      });
    }

    if (!err) {
      this.props.onSuccess(feedback.env);
    }

    // If validation failed, short circuit
    if (err) {
      emitter.emit('levelLifecycle', {
        name: 'objectiveFailed',
        objective: this.props.hackObject.objectiveName,
      });
      return null;
    }

    // If the objective is already complete, short circuit
    if (this.props.hackObject.complete === true) {
      emitter.emit('levelLifecycle', {
        name: 'objectiveCompletedAgain',
        objective: this.props.hackObject.objectiveName,
      });
      return null;
    }

    // If validation succeeds, save the completed mission objective to the db
    // and award XP and items based on objective configuration
    this.completeObjective();
  }

  completeObjective() {
    console.log(`objective progress saved`);
    this.setState({ clear: true });
    this.props.hackObject.markAsComplete();

    // hackObjects that do not have an implemented markAsComplete
    // need to be manually set to complete
    this.props.hackObject.complete = true;

    // Grant item and XP rewards
    if (this.props.objective.rewards) {
      setContext({ xp: this.context.xp + this.props.objective.rewards.xp });
      addItems(this.props.objective.rewards.items);
    }

    const objectiveKey = `${this.props.hackObject.level.levelName}.${this.props.hackObject.objectiveName}`;

    setContext({
      completedObjectives: {
        ...this.context.completedObjectives,
        [objectiveKey]: {
          missionName: this.props.hackObject.level.levelName,
          objectiveName: this.props.hackObject.objectiveName,
          completedOn: new Date(),
        },
      },
    });

    emitter.emit('levelLifecycle', {
      name: 'objectiveCompleted',
      objective: this.props.hackObject.objectiveName,
    });

    // Send objective completion to live event, if it exists
    if (this.context.liveEvent) {
      const { liveEvent } = this.context;

      Firestore.collection('liveEvents')
        .doc(liveEvent.id)
        .get()
        .then(async doc => {
          if (doc.exists) {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            const start = doc.data().startDate
              ? doc.data().startDate.seconds * 1000
              : null;
            const end = doc.data().endDate
              ? doc.data().endDate.seconds * 1000
              : null;

            // Only send achievement if the event has a start time in the
            // past and an end time in the future (with a one day buffer on
            // each side). Regard missing start or end times as valid.
            if (
              (!start || start - oneDay < now) &&
              (!end || end + oneDay > now)
            ) {
              const missionData = await levelLoader.getFullMissionData(
                this.props.hackObject.level
              );

              Firestore.collection('liveEventAchievements')
                .doc(
                  `${liveEvent.guid}.${this.props.hackObject.level.levelName}.${this.props.hackObject.objectiveName}`
                )
                .set({
                  mission: this.props.hackObject.level.levelName,
                  objective: this.props.hackObject.objectiveName,
                  missionDisplayName: missionData.levelProperties.title,
                  objectiveDisplayName: this.props.objective.title,
                  xp: this.props.objective.rewards.xp,
                  event: liveEvent.id,
                  guid: liveEvent.guid,
                  customAvatar: this.context.customAvatar,
                  loadout: populateLoadoutWithItems(this.context.loadout),
                  avatar: this.context.settings.avatar,
                  player: this.context.settings.name,
                  createdAt: new Date(),
                });
            } else {
              // If the event's times aren't valid, disconnect from it.
              setContext({ liveEvent: null });
            }
          } else {
            // If the event doesn't exist, disconnect from it.
            setContext({ liveEvent: null });
          }
        });
    }

    gameEvents.logMissionObjectiveCompletion(
      {
        ...this.props,
        env: this.context.env,
        settings: this.context.settings,
      },
      this.context.liveEvent
    );

    ga.event(
      'Hacking',
      'Reward Earned',
      this.props.objective.title,
      this.props.objective.rewards.xp,
      this.props.objective.title,
      `/levels/${this.props.hackObject.level.levelName}/${this.props.hackObject.objectiveName}`
    );
  }

  removeObjective() {
    console.log('objective progress deleted');

    // Removes this objective from the 'completedObjectives' context
    const world = new World(this.props.hackObject.level.levelName);
    world.removeObjective(
      this.props.hackObject.level.levelName,
      this.props.hackObject.objectiveName
    );

    // Remove item and XP rewards
    if (this.props.objective.rewards) {
      setContext({ xp: this.context.xp - this.props.objective.rewards.xp });
      world.removeItems(this.props.objective.rewards.items);
    }

    this.setState({ clear: false });

    // Updates the visual for the terminal to show the lock on the screen
    this.props.hackObject.setState({
      ...this.props.hackObject.state,
      isCompleted: false,
    });

    this.props.hackObject.complete = false;

    // Updates the HackInterface
    this.doReset();
  }

  updateFieldValues(newValue, fieldName) {
    let fieldValues = this.state.validationFields;
    fieldValues[fieldName] = newValue;
    this.setState({
      validationFields: fieldValues,
    });
  }

  doReset() {
    this.setState({
      feedback: '',
      statusColor: this.state.clear ? 'blue' : 'red',
      statusReadout: this.state.clear ? STATUS.CLEAR : STATUS.LOCKED,
      copiedObjectiveDebugInfo: false,
    });
    this.props.onReset();
  }

  copyObjectiveDebugInfo() {
    const objective = this.props.objective;

    // Building the string this way, because template literals inserts tabs and spaces where they aren't needed
    // The formatting is tailored for Discord (e.g. the use of **{TEXT}** and ```js{CONTENT}```)
    let objectiveDebugInfo =
      `**Location:** ${this.props.hackObject.level.levelName}.${this.props.hackObject.level.levelMapName}.${this.props.hackObject.objectiveName}\n` +
      `**Objective Title:** ${objective.title}\n` +
      `**Objective Description:** ${objective.description}\n` +
      `**Error:** ${this.state.feedback || 'No error present!'}`;

    const objectiveInputs = objective.validation_fields;

    if (objectiveInputs.length > 0) {
      objectiveDebugInfo += '\n**Inputs:**';

      objectiveInputs.forEach(input => {
        const inputName = input.name;
        const inputIsSecret = input.sensitive;
        let inputValue;

        if (inputIsSecret) {
          inputValue = '****';
        } else {
          inputValue = this.state.validationFields[inputName];
        }

        objectiveDebugInfo += `\n*${inputName}* -> ${inputValue}`;
      });
    }

    if (objective.show_ide) {
      // Since the ace editor is present in the window scope, we're grabbing the same instance the QuestIDE is using and
      // reading it's value
      const currentQuestIDECode = window.ace.edit('code-editor').getValue();
      objectiveDebugInfo +=
        '\n\n**Current QuestIDE Code:**\n' +
        '```js\n' +
        currentQuestIDECode +
        '```';
    }

    navigator.clipboard.writeText(objectiveDebugInfo);

    this.setState({
      copiedObjectiveDebugInfo: true,
    });
  }

  render() {
    let content = [];

    // Display feedback instead of fields if applicable
    if (this.state.feedback) {
      content = (
        <div className="validation-feedback">
          <p dangerouslySetInnerHTML={{ __html: this.state.feedback }} />
          <p>
            <button onClick={() => this.doReset()}>
              &lt; Back to tutorial
            </button>
          </p>
        </div>
      );
    } else {
      // Optionally include link to launch Quest IDE
      if (this.props.objective.show_ide) {
        if (this.props.ideVisible) {
          content.push(
            <div key="questide" className="ide-prompt">
              <Button onClick={() => this.props.launchIde()}>
                <i className="fas fa-file-alt" /> Show Tutorial
              </Button>
            </div>
          );
        } else {
          content.push(
            <div key="questide" className="ide-prompt">
              <Button onClick={() => this.props.launchIde()}>
                <i className="fas fa-code" /> Show Code Editor
              </Button>
            </div>
          );
        }
      }

      // Display validation fields
      content.push(
        this.props.objective.validation_fields.map(field => {
          const labelHtml = MD.makeHtml(field.label);

          if (field.type === 'prompt') {
            return (
              <div className="validation-field" key={field.name}>
                <div
                  className="prompt"
                  dangerouslySetInnerHTML={{ __html: labelHtml }}
                />
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div className="validation-field" key={field.name}>
                <label dangerouslySetInnerHTML={{ __html: labelHtml }} />
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  value={this.state.validationFields[field.name] || ''}
                  onChange={e =>
                    this.updateFieldValues(e.target.value, field.name)
                  }
                  onFocus={() => this.validationFieldFocus()}
                  onBlur={() => this.validationFieldBlur()}
                />
              </div>
            );
          }

          if (field.type === 'boolean') {
            return (
              <div className="validation-field" key={field.name}>
                <label dangerouslySetInnerHTML={{ __html: labelHtml }} />
                <input
                  type="radio"
                  name={field.name}
                  id={`input-${field.name}-true`}
                  value="true"
                  onFocus={() => this.validationFieldFocus()}
                  onBlur={() => this.validationFieldBlur()}
                  checked={this.state.validationFields[field.name] === 'true'}
                  onChange={e =>
                    this.updateFieldValues(e.target.value, field.name)
                  }
                />
                <label
                  htmlFor={`input-${field.name}-true`}
                  style={{ display: 'inline-block', padding: '0 20px 0 5px' }}
                >
                  True
                </label>
                <input
                  type="radio"
                  name={field.name}
                  id={`input-${field.name}-false`}
                  value="false"
                  onFocus={() => this.validationFieldFocus()}
                  onBlur={() => this.validationFieldBlur()}
                  checked={this.state.validationFields[field.name] === 'false'}
                  onChange={e =>
                    this.updateFieldValues(e.target.value, field.name)
                  }
                />
                <label
                  htmlFor={`input-${field.name}-false`}
                  style={{ display: 'inline-block', padding: '0 5px' }}
                >
                  False
                </label>
              </div>
            );
          }

          let newFieldType = field.type;
          const fieldIsSensitive = field.sensitive;

          if (fieldIsSensitive) {
            newFieldType = 'password';
          }

          return (
            <div className="validation-field" key={field.name}>
              <label dangerouslySetInnerHTML={{ __html: labelHtml }} />
              <input
                className="validation-input-text"
                type={newFieldType}
                placeholder={field.placeholder}
                value={this.state.validationFields[field.name] || ''}
                onChange={e =>
                  this.updateFieldValues(e.target.value, field.name)
                }
                onFocus={() => this.validationFieldFocus()}
                onBlur={() => this.validationFieldBlur()}
              />
            </div>
          );
        })
      );
    }

    return (
      <div className="Validator">
        <div className={`status-readout ${this.state.statusColor}`}>
          <div>{this.state.statusReadout}</div>
        </div>
        <div className="validation-input">
          {content}
          <p>
            <CopyDebugInfoButton
              disableNotification={() =>
                this.setState({
                  copiedObjectiveDebugInfo: false,
                })
              }
              shouldNotify={this.state.copiedObjectiveDebugInfo}
              doesFeedbackExist={this.state.feedback}
              onClick={() => this.copyObjectiveDebugInfo()}
            >
              Copy debug info
            </CopyDebugInfoButton>
          </p>
        </div>
        <div className="validation-button">
          {this.state.statusReadout === STATUS.FAIL ? null : (
            <Button
              label={this.state.feedback ? 'DONE' : 'HACK'}
              onClick={() =>
                this.state.feedback ? this.props.onDone() : this.validate()
              }
              disabled={this.state.disabled}
            />
          )}
        </div>
      </div>
    );
  }
}
