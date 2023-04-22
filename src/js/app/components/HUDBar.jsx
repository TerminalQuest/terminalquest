import React from 'react';
import numeral from 'numeral';
import sharedListener from '../common/listener';
import { context, setContext, emitter } from '../common/context';
import rank from '../common/rank';
import CharacterAvatar from './CharacterAvatar';

const DEF_TITLE = 'TerminalQuest';
const DEF_DESC = 'Explore The Cloud and build your programming skills!';

export default class HUDBar extends React.Component {
  static contextType = context;

  state = {
    currentObjectiveTitle: DEF_TITLE,
    currentObjective: DEF_DESC,
    showFogOwlButton: false
  };

  componentDidMount() {
    // set up hotkeys after component mounts
    sharedListener.simple_combo('1', () => this.toggleMenu('inventory'));
    sharedListener.simple_combo('2', () => this.toggleMenu('journal'));
    sharedListener.simple_combo('3', () => this.toggleMenu('settings'));
    sharedListener.simple_combo('4', () => this.toggleMenu('help'));
    sharedListener.simple_combo('5', () => this.returnToFogOwl());

    // retain previous shortcuts since we still have content which mentions
    // these keyboard shortcuts, still want them to work.
    sharedListener.simple_combo('i', () => this.toggleMenu('inventory'));
    sharedListener.simple_combo('j', () => this.toggleMenu('journal'));
    sharedListener.simple_combo('o', () => this.toggleMenu('settings'));
    sharedListener.simple_combo('h', () => this.toggleMenu('help'));
    sharedListener.simple_combo('r', () => this.returnToFogOwl());

    emitter.on('contextUpdate:currentLevel', () => {
      if (this.context.currentLevel) {
        // If a level has been selected, update the status
        this.updateQuestStatus();
      }

      // TODO - consider a level.json property to specify whether or not the
      // Return to Fog Owl button should show for a given level
      this.setState({
        showFogOwlButton: this.context.currentLevel &&
          this.context.currentLevel.levelName !== 'fog_owl' &&
          this.context.currentLevel.levelName !== 'owls_nest'
      });
    });

    emitter.on('contextUpdate:questStatus', () => {
      this.updateQuestStatus();
    });
  }

  // Update quest title and description for current level
  updateQuestStatus() {
    const levelQuestStatus = this.context.questStatus ?
      this.context.questStatus[this.context.currentLevel.levelName] :
      {};
    
    this.setState({
      currentObjectiveTitle: levelQuestStatus ?
        levelQuestStatus.title : this.state.currentObjectiveTitle,
      currentObjective: levelQuestStatus ?
        levelQuestStatus.description : this.state.currentObjective
    });
  }

  // Handle menu navigation
  toggleMenu(name) {
    const current = this.context.currentMenu;

    // Toggle menu off if the same menu hotkey is pressed again
    if (!name || (current && current.name === name)) {
      setContext({ currentMenu: null });
    } else {
      setContext({ currentMenu: { name }});
    }
  }

  returnToFogOwl() {
    if (this.state.showFogOwlButton && window.confirm('Return to the Fog Owl?')) {
      setContext({
        currentLevel: {
          levelName: 'fog_owl',
          playerEntryPoint: 'player_entry1',
        }
      });
    }
  }

  render() {
    return (
      <div className="HUDBar">
        <section className="user" onClick={() => this.toggleMenu('inventory')}>
          <CharacterAvatar className="w3 h3 mr1" />
          <div>
            {this.context.settings.name}
            <p>
              XP: <span>{numeral(this.context.xp).format('0,0')}</span>&nbsp;
              Rank: <span>
                {rank(Object.keys(this.context.completedObjectives).length, this.context.numObjectives)}
              </span>
            </p>
          </div>
        </section>
        <section className="buttons">
          <div className="relative" onClick={() => this.toggleMenu('inventory')}>
            <img src="images/app/hud_bar/inventory.png" alt="Inventory (1)" />
            <p>1</p>
            <span className="tooltip">Inventory</span>
          </div>
          <div className="relative" onClick={() => this.toggleMenu('journal')}>
            <img src="images/app/hud_bar/book.png" alt="Journal (2)" />
            <p>2</p>
            <span className="tooltip">Journal</span>
          </div>
          <div className="relative" onClick={() => this.toggleMenu('settings')}>
            <img src="images/app/hud_bar/settings.png" alt="Settings (3)" />
            <p>3</p>
            <span className="tooltip">Settings</span>
          </div>
          <div className="relative" onClick={() => this.toggleMenu('help')}>
            <img src="images/app/hud_bar/help.png" alt="Help (4)" />
            <p>4</p>
            <span className="tooltip">Help</span>
          </div>

          {this.state.showFogOwlButton && (
            <section className="fogOwl" onClick={() => this.returnToFogOwl()}>
              <img src="images/app/fog_owl.gif" alt="Return to Fog Owl (5)" />
              <p>5</p>
              <span className="tooltip">Return to Fog Owl</span>
            </section>
          )}

        </section>
        <section
          className="currentObjective"
          onClick={() => this.toggleMenu('journal')}
        >
          <span className="objectiveHeader">
            {this.state.currentObjectiveTitle}
          </span>
          <span>
            {this.state.currentObjective}
          </span>
        </section>
      </div>
    );
  }
}
