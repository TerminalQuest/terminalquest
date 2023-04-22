import path from 'path';
import { emitter } from './context';
import World from './world';
import { requireFromExtension } from './assetLoader';
import levelLoader from './levelLoader';

function convertEventNameToHandlerName(eventName) {
  return `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
}

export default class LevelLifecycleManager {
  eventHandler = null;
  isEventsModuleBundled = false;
  level = null;
  world = null;

  constructor() {
    // Pass lifecycle events down to level-specific handler
    emitter.on('levelLifecycle', this.callEventHandler.bind(this));
  }

  callEventHandler(event) {
    if (this.level.entityService) {
      this.level.entityService.getAll().forEach(entity => {
        const handlerName = convertEventNameToHandlerName(event.name);
        if (
          entity &&
          entity.instance &&
          entity.instance.eventHandlers &&
          entity.instance.eventHandlers[handlerName]
        ) {
          entity.instance.eventHandlers[handlerName](
            entity.instance.generateSelfAPI(this.world),
            event,
            this.world.generateAPI()
          );
        }
      });
    }

    if (this.eventHandler) {
      this.eventHandler(
        event,
        this.world.generateAPI(this.isEventsModuleBundled)
      );
    }
  }

  async setLevel(level) {
    this.level = level;
    this.world = new World(level);
    try {
      // Get extension relative events path
      const eventModulePath = levelLoader.getEventsModulePath(level.levelName);
      // Set the new event handler - can be null, which is fine.
      const isEventsModuleBundled = await levelLoader.isEventsModuleBundled(
        level.levelName
      );
      const newHandler = await requireFromExtension(eventModulePath);

      this.isEventsModuleBundled = isEventsModuleBundled;
      this.eventHandler = newHandler;
    } catch (e) {
      console.error(`Error loading event hander for ${level}`);
      console.error(e);
    }
  }
}
