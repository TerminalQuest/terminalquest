// Key used to persist state about this mission across loads
// This key should be unique amongst loaded missions to prevent
// data collisions.
const WORLD_STATE_KEY = 'scaffoldMissionState';

// This object should represent the default state of your mission.
const DEFAULT_MISSION_STATE = {};

// If this is set to true, then your mission will not persist any
// state when reloading. This can make testing easier.
const DEBUG_MODE = false;

// The event.js file exports a single function that receives an
// event with information about something that happened in TerminalQuest. 
// This function's second parameter is a world object that provides
// APIs to change the TerminalQuest game environment.
module.exports = function (event, world) {
  // This section of code will reset your mission's world state if 
  // DEBUG_MODE is true and the level just loaded.
  if (DEBUG_MODE && event.name === 'levelDidLoad') {
    world.setState(WORLD_STATE_KEY, DEFAULT_MISSION_STATE);
  }

  // Load the initial state of your mission. Prefer to use any previously
  // stored state. 
  // 
  // NOTE: If you change the structure of your mission's state object, you
  // can cause unexpected errors for users who have saved an old version of the
  // mission's state.
  const worldState =
    world.getState(WORLD_STATE_KEY) || DEFAULT_MISSION_STATE;

  // Log the inputs to the events.js function for visibility
  console.log(event, world);

  // Persists your current worldState object in your registered state key.
  world.setState(WORLD_STATE_KEY, worldState);
};