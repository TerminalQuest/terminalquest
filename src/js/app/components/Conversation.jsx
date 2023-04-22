import React from 'react';
import pug from 'pug';
import cheerio from 'cheerio';
import fileUrl from 'file-url';
import { keypress } from 'keypress.js';
import audioManager from '../common/audio/index';
import sharedListener from '../common/listener';
import { getContext, setContext, emitter } from '../common/context';
import levelLoader from '../common/levelLoader';
import { resolveAbsolutePath } from '../common/assetLoader';

// Initial state, to be used to reset when menu has been exited
const INITIAL_STATE = {
  visible: false,
  npc: {},
  conversation: {},
};

export default class Conversation extends React.Component {
  state = INITIAL_STATE;

  constructor(props) {
    super(props);
    this.keypressListener = new keypress.Listener();
    this.keypressListener.stop_listening();
  }

  componentDidMount() {
    // Set up conversation choice hotkeys
    for (let i = 0; i < 9; i++) {
      this.keypressListener.simple_combo(
        `${i + 1}`,
        async () => await this.chooseResponseAtIndex(i)
      );
    }

    // Listen for conversation start event
    emitter.on('contextUpdate:conversationNpc', npc => {
      const newState = npc
        ? {
            ...INITIAL_STATE,
            npc,
            visible: false,
          } // We want to ensure other state data is reset
        : INITIAL_STATE;

      this.setState(newState, async () => {
        if (npc && npc.conversation) {
          sharedListener.stop_listening();
          this.keypressListener.listen();

          await this.setCurrentNpcConversationInState();

          this.startConversation();
        } else {
          sharedListener.listen();
          this.keypressListener.stop_listening();
        }
      });
    });
  }

  startConversation() {
    this.setState(
      {
        visible: true,
      },
      () => {
        const { conversation, npc } = this.state;

        this.playVoiceOver(`${npc.conversation}_${conversation.statement.key}`);
      }
    );
  }

  async setCurrentNpcConversationInState(conversationContext) {
    const builder = new ConversationBuilder(this.state.npc, {
      ...conversationContext,
      settings: getContext('settings'),
      loadout: getContext('loadout'),
      inventory: getContext('inventory'),
      env: getContext('env'),
      completedObjectives: getContext('completedObjectives'),
      teams: getContext('teams'),
      operations: getContext('operations'),
      xp: getContext('xp'),
      getState: key => getContext('levelState')[key],
      setState: (key, value) => {
        setContext({
          levelState: { ...getContext('levelState'), [key]: value },
        });
      },
    });

    const conversation = await builder.build();
    this.setState({ conversation });

    // State updates are asynchronous so return conversation for immediate use
    return conversation;
  }

  async chooseResponseAtIndex(i) {
    // Ignore if the conversation UI is not showing
    if (!this.state.visible) return;

    const { responses } = this.state.conversation;

    if (i === responses.length) {
      // the last option is always the end conversation option
      this.endConversation();
    } else if (i < responses.length) {
      // Otherwise, choose the appropriate response
      await this.chooseResponse(responses[i]);
    }
  }

  endConversation() {
    this.stopVoiceOvers();
    emitter.emit('levelLifecycle', {
      name: 'conversationDidEnd',
      npc: this.state.npc,
    });
    setContext({ conversationNpc: null });
  }

  async chooseResponse(response) {
    const conversation = await this.setCurrentNpcConversationInState({
      lastResponse: response.key,
    });

    this.playVoiceOver(
      `${this.state.npc.conversation}_${conversation.statement.key}`
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.visible &&
      prevState.conversation !== this.state.conversation
    ) {
      document.getElementById('dialogue-inner').scrollTop = 0;
    }
  }

  playVoiceOver(key) {
    audioManager.music.setMaxVolumeAll(0.02, false);
    audioManager.vo.play(key);
  }

  stopVoiceOvers() {
    audioManager.vo.stopAll();
    audioManager.music.setMaxVolumeAll(1.0);
  }

  render() {
    if (!this.state.visible) return null;

    const { statement = {}, responses = [] } = this.state.conversation;

    const responseElements = [
      ...responses.map((response, index) => (
        <ConversationChoice
          index={index}
          key={index}
          text={response.text}
          onClick={async () => await this.chooseResponse(response)}
        />
      )),
      <ConversationChoice
        index={responses.length}
        key={responses.length}
        text={'<end conversation>'}
        onClick={() => this.endConversation()}
      />,
    ];

    return (
      <div className="Conversation">
        <div className="frosty" onClick={() => this.endConversation()} />
        <div className="dialogue-box">
          <div className="avatar">
            <img src={this.state.conversation.avatarUrl} />
            <p>{this.state.conversation.displayName}</p>
          </div>
          <div className="dialogue">
            <div id="dialogue-inner" className="dialogue-inner">
              <p dangerouslySetInnerHTML={{ __html: statement.text }} />
              {responseElements}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const ConversationChoice = ({ index, text, onClick }) => (
  <div className="conversationChoice" onClick={onClick} key={index}>
    {`${index + 1}.) ${text}`}
  </div>
);

class ConversationBuilder {
  constructor(npc, context) {
    this.npc = npc;
    this.context = context;
  }

  async readNpcConversationTemplate() {
    const conversationsDir = levelLoader.getConversationsDir(
      this.npc.level.levelName
    );
    const relativeConversationPath = `${conversationsDir}/${this.npc.conversation}.pug`;
    const absoluteConversationPath = await resolveAbsolutePath(
      relativeConversationPath
    );

    if (!absoluteConversationPath) {
      throw new Error(
        `Could not find the the conversation file for the conversation "${relativeConversationPath}"`
      );
    }

    return pug.renderFile(absoluteConversationPath, this.context);
  }

  async parse(conversationHtml) {
    const $ = cheerio.load(conversationHtml);

    const displayName = $('conversation').attr('display_name');

    const responses = $('conversation>responses')
      .children('response')
      .toArray()
      .map(response => {
        const key = $(response).attr('id');
        const text = $(response).text();

        return {
          key,
          text,
        };
      });

    const statementEl = $('conversation>statement');

    let text;
    if (statementEl[0].children.length > 0) {
      // Use children of inline statement first
      text = statementEl.html();
    } else {
      // Look up conversation's statement node text
      const textEl = $(
        `conversation>statements>statement#${statementEl.attr('id')}>text`
      );
      text = textEl.html();
    }

    const statement = {
      key: statementEl.attr('id'),
      text,
      expression: statementEl.attr('expression') || undefined,
    };

    // Set up avatar image path
    const avatarPath = await resolveAbsolutePath(
      statement.expression
        ? `images/conversations/${statement.expression}`
        : `images/conversations/${this.npc.name}`
    );
    const avatarUrl = fileUrl(avatarPath);

    return { displayName, avatarUrl, statement, responses };
  }

  async build() {
    const conversationHtml = await this.readNpcConversationTemplate();
    return await this.parse(conversationHtml);
  }
}
