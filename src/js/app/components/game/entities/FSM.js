/**
 * @typedef {Object} FSMConfig
 * Describes the states and actions in the Finite State Machine. Every property
 * of this object is an FSMState in the assembled machine.
 *
 * @example
 *  {
 *      state1: {
 *        actions: {
 *          action1: callback1
 *          action2: callback2
 *        },
 *        onEnter: onCallbackEnter
 *      },
 *      state2: {
 *        actions: {
 *          action1: callback1
 *        },
 *        onEnter: onCallbackEnter
 *      }
 *  }
 */

/**
 * @typedef {Object} FSMState
 * Describes one of the states in the state machine.
 *
 * @param {Object} props.actions - A map of all the actions this state can handle. Each property is the name of a valid action for this state. The value of each property is a callback that is triggered as each action is called.
 * @param {Function} props.onEnter - A callback that is triggered when the stat is entered
 */

/**
 * Finite State Machine or FSM.
 *
 * @param {FSMConfig} states - configuration for this FSM
 * @param {String} initialState - key of the initial state of this FSM
 * @
 */
export default class FSM {
  constructor(states, initialState) {
    this.currentState = initialState;
    this.states = states;
  }

  /**
   * Trigger an action in the FSM. This is the primary way users should
   * interface with the FSM.
   *
   * @param {String} action - the string value of a valid action
   */
  action(action, payload) {
    if (this.states[this.currentState].actions[action]) {
      this.states[this.currentState].actions[action](payload);
    }
  }

  /**
   * Change the current state of the FSM. This should be called from inside
   * an action callback. External actors should not use this function.
   *
   * @param {String} state - the new target state
   */
  transition(state) {
    this.currentState = state;

    if (this.states[this.currentState].onEnter) {
      this.states[this.currentState].onEnter();
    }
  }
}
