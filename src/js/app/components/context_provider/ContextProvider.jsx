import React from 'react';
import Store from 'electron-store';
import {
  context,
  getContext,
  setContext,
  getSavedFields,
} from '../../common/context';
import { addItems } from './itemsHelper';
import { migrateAnalyticsIdToUserGuid, initializeUserIdentity } from './user';
import { initializeSystemInfo } from './system';
import loadItemsFromDisk from './loadItemsFromDisk';
import levelLoader from '../../common/levelLoader';
import analytics from '../../common/analytics';
import { syncBundledAssets } from '../../common/assetLoader';
import { reduceEntries } from '../../common/context/schema';

export default class ContextProvider extends React.Component {
  // Any data that will ever live in this component should have an entry here in
  // alphabetical order. The value should be a sensible default: 0 or 1 for
  // numbers, '' for strings, `null` for objects, [] for arrays, and {} for
  // dictionaries (even though objects and dictionaries are essentially the same
  // thing in JavaScript, we differentiate between the usage of, for example,
  // `currentLevel` and `items`, and their default value should reflect that).
  state = {
    completedObjectives: {},
    currentLevel: null,
    customAvatar: {
      sc: 0,
      ec: 0,
      hc: 0,
      hs: 0,
      uri: '',
    },
    dragItem: '',
    env: {},
    extensions: {
      enabled: false,
      directory: null,
    },
    hackObject: null,
    inventory: [],
    items: {},
    levelState: {},
    liveEvent: null,
    loadout: {},
    migrations: {},
    numObjectives: null,
    settings: {
      avatar: 1,
      name: '',
    },
    showMissionComputer: false,
    showOnboarding: false,
    showTitle: true,
    systemInfo: {},
    teams: { joined: [] },
    operations: { joined: [] },
    toastMessage: '',
    unlockCodes: [],
    user: {},
    xp: 0,
  };

  store = new Store();

  // Load item catalog from disk and add in any saved values, then setState with
  // it to initialize the app state
  async componentDidMount() {
    const pipeAsync = (...fns) => initialValue =>
      fns.reduce(
        (currentValue, fn) => currentValue.then(fn),
        Promise.resolve(initialValue)
      );
    const sideEffect = sideEffectFn => value => {
      sideEffectFn(value);

      return value;
    };

    /**
     * TODO: 10/13/2020
     * Eventually, all the subsequent setContext calls from below in the
     * setState call below should be moved into this pipe'd initialState
     * creation.
     *
     * In the setState pattern below, when setContext is called it is
     * effectively calling setState inside of the main setState you see below.
     *
     * This is generally a bad practice in React because setState is not
     * synchronous. The code flow _implies_ that you can rely on the previously
     * setState'd values. However, you cannot. There's no guarantee subsequent
     * setStates are called in any particular order.
     *
     * ---
     *
     * This new pipe pattern enforces synchrnous, functional transforms of
     * state instead.
     */
    const initialState = await pipeAsync(
      async state => ({ ...state, items: await loadItemsFromDisk() }),
      state => {
        getSavedFields().forEach(key => {
          const savedValue = this.store.get(key);
          if (savedValue) {
            state[key] = savedValue;
          }
        });

        return state;
      },
      migrateAnalyticsIdToUserGuid,
      initializeUserIdentity,
      initializeSystemInfo,
      sideEffect(analytics.initializeAnalytics)
    )(this.state);

    // This is the only time setState should be used in this file--elsewere, use
    // setContext instead, which emits the proper events and checks the
    // getSavedFields from schema to save the appropriate fields to disk.
    this.setState(initialState, async () => {
      // We call set context here so that we can trigger all the appropriate
      // validation, field saving, and other side effects that setContext
      // needs to trigger after we've set the intial state of the app.
      setContext(initialState);

      // TODO: 10/13/2020
      // Everything below this point should be migrated into the initialState
      // pipe set up above. This will require converting the setContext calls
      // into functional state transformations.

      // If inventory is empty, add tshirt and jeans to inventory and equip
      if (!this.state.inventory || !this.state.inventory.length) {
        addItems(['tshirt', 'jeans']);
        setContext({
          loadout: {
            body: 'tshirt',
            legs: 'jeans',
          },
        });
      }

      try {
        await levelLoader.importLevels();

        const missions = await levelLoader.getFullMissionList();
        const numObjectives = missions.reduce((acc, mission) => {
          return acc + mission.objectives.length;
        }, 0);

        setContext({ numObjectives });

        // MIGRATION(nirav) 201911_objectives_in_context
        // Move objective completion state to global state
        if (!this.state.migrations['201911_objectives_in_context']) {
          setContext({
            migrations: {
              ...this.state.migrations,
              '201911_objectives_in_context': true,
            },
            completedObjectives: await levelLoader.getCompletedObjectiveMap(),
          });
        }

        // MIGRATION(ryan) 201912_xp_in_context_fix
        // Player's XP was migrated incorrectly, check if players
        // have already undergone migration 201911_xp_in_context
        // while it was still broken, then fix it.
        if (!this.state.migrations['201912_xp_in_context_fix']) {
          if (this.state.migrations['201911_xp_in_context']) {
            const currentSystemPlayerXp = getContext('xp');
            const oldSystemPlayerXp = await levelLoader.getCurrentPlayerXp();

            if (currentSystemPlayerXp < oldSystemPlayerXp) {
              // player's new xp is less than the amount of objs they
              // completed in the old system
              setContext({
                migrations: {
                  ...this.state.migrations,
                  '201912_xp_in_context_fix': true,
                },
                // Don't remove any new objs that player has completed
                xp: oldSystemPlayerXp,
              });
            }
          }
        }

        // MIGRATION(nirav) 201911_xp_in_context
        // Move player's total XP to global state
        if (!this.state.migrations['201911_xp_in_context']) {
          setContext({
            migrations: {
              ...this.state.migrations,
              '201911_xp_in_context': true,
            },
            xp: await levelLoader.getCurrentPlayerXp(),
          });
        }

        // MIGRATION(ryan) 202204_loadout_to_item_keys
        // Convert a players' loadout items to just their item keys
        if (!this.state.migrations['202204_loadout_to_item_keys']) {
          const loadoutEntries = Object.entries(this.state.loadout);

          const resolvedLoadoutEntries = loadoutEntries.map(([slot, item]) => {
            // If slot has an item object, convert it to just the itemKey
            if (item !== null && typeof item === 'object') {
              return [slot, item.name];
            }

            // If item is not an object, it should already be an
            // itemKey or null.
            return [slot, item];
          });

          const loadout = reduceEntries(resolvedLoadoutEntries);

          setContext({
            migrations: {
              ...this.state.migrations,
              '202204_loadout_to_item_keys': true,
            },
            loadout,
          });
        }

        const initialMission = levelLoader.getInitialMission();

        if (!initialMission) {
          console.error('Initial mission does not exist!');
        }

        setContext({ currentLevel: initialMission });

        setContext({
          contextInitialized: true,
        });
      } catch (err) {
        console.error(err);
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const isContextNewlyInitialized = () =>
      !prevState.contextInitialized && this.state.contextInitialized;

    if (isContextNewlyInitialized()) {
      // This is where initialization logic dependent on context state
      // should live.
      syncBundledAssets();
    }
  }

  render() {
    return (
      <context.Provider value={this.state}>
        {this.props.children}
      </context.Provider>
    );
  }
}
