import v4 from 'uuid/v4';

/**
 * @typedef {Object} Entity
 * An actor in the game containing a game object instance and information
 * about how it is treated by other actors.
 *
 * @param {Object} instance - game object instance, i.e. SpriteObject
 * @param {string[]} collections - list of collections this entity is part of, can be empty array
 * @param {string} group - the group this entity is associated with, can be empty/undefined
 * @param {string} guid - unique identifier assigned at registration with EntityService
 */

class EntityService {
  constructor(scene) {
    this.scene = scene;

    this.entities = [];
    this.collections = {
      npcs: [],
      interactables: [],
      transitions: [],
      chests: [],
      triggerAreas: [],
      player: [],
      points: [],
    };
    this.groups = {};
  }

  /**
   * Create a Phaer.Group in the EntityService.
   *
   * This should be used in the create step of a Phaser.Scene to ensure that
   * groups are given the proper sorting ordering.
   *
   * Groups created later will be drawn over top of earlier groups.
   *
   * @param {string} name - unique identifier for this group
   */
  createGroup(name) {
    this.groups[name] = this.scene.game.add.group();
  }

  /**
   * Register a newly created Entity instance with the EntityService.
   *
   * To be used primarily by EntityFactory when reading in Tiled data.
   * @param {Object} params.instance - instance of a game object
   * @param {string[]} [params.collections] - list of strings identifying the collections this entity should be part of
   * @param {string} [params.group] - string indicating the group this entity should be assigned to
   */
  registerEntity({ instance, collections = [], group }) {
    const entity = { instance, collections, group, guid: v4() };

    this.entities.push(entity);

    collections.forEach(collection => {
      this.collections[collection].push(entity);
    });

    if (group) {
      const targetGroup = this.groups[group];

      if (!targetGroup) {
        // group not registered
        console.warn(
          `Tried to register an entity to a group "${group}" that does not exist`,
          entity
        );
        return;
      }

      targetGroup.add(instance.sprite);

      if (instance.layerSprites) {
        instance.layerSprites.forEach(layer => {
          targetGroup.add(layer);
        });
      }
    }
  }

  /**
   * Retrieve a single Entity.
   *
   * @param {string} guid - unique identifier for an entity
   * @returns {Entity}
   */
  get(guid) {
    return this.entities.find(entity => entity.guid === guid);
  }

  /**
   * Remove a single Entity from the EntityService.
   *
   * This removes the Entity from all collections and its group.
   *
   * @param {string} guid - unique identifier for an entity
   * @returns {Entity}
   */
  remove(guid) {
    const entitiesIndex = this.entities.findIndex(
      entity => entity.guid === guid
    );

    if (entitiesIndex === -1) {
      // entity not found
      return;
    }

    // remove entity from master array
    const [entity] = this.entities.splice(entitiesIndex, 1);

    // remove entity from its collections
    entity.collections.forEach(collection => {
      const collectionIndex = this.collections[collection].findIndex(
        entity => entity.guid === guid
      );

      this.collections[collection].splice(collectionIndex, 1);
    });

    // remove entity from its group
    if (entity.group) {
      this.groups[entity.group].remove(entity.instance.sprite);
    }

    return entity;
  }

  /**
   * Remove a single Entity from the EntityService and destroy it. Destroy is important to clean up Phaser related data.
   *
   * This removes the Entity from all collections and its group.
   *
   * @param {string} guid - unique identifier for an entity
   * @returns {Entity}
   */
  destroy(guid) {
    const entity = this.remove(guid);

    if (entity.instance.destroy) {
      entity.instance.destroy();
    }
  }

  /**
   * Retrieve all entities that the filterFunction passes.
   *
   * If no filterFunction is passed, this function will return all registered entities.
   *
   * @param {function(Entity, index, Entity[]): boolean?} [filterFunction] - filter function to be used like {@link Array.prototype.filter}
   * @returns {Entity[]}
   */
  getAll(filterFunction = () => true) {
    return this.entities.filter(filterFunction);
  }

  /**
   * Remove all entities that the filterFunction passes from the EntityService.
   *
   * If no filterFunction is passed, this function will remove all registered entities.
   *
   * @param {function(Entity, index, Entity[]): boolean?} [filterFunction] - filter function to be used like {@link Array.prototype.filter}
   * @returns {Entity[]}
   */
  removeAll(filterFunction) {
    const guids = this.getAll(filterFunction);

    const removedEntities = guids.map(({ guid }) => this.remove(guid));

    return removedEntities;
  }

  /**
   * Remove all entities that the filterFunction passes from the EntityService and destroy them. Destroy is important to clean up Phaser related data.
   *
   * If no filterFunction is passed, this function will remove all registered entities.
   *
   * @param {function(Entity, index, Entity[]): boolean?} [filterFunction] - filter function to be used like {@link Array.prototype.filter}
   */
  destroyAll(filterFunction) {
    const entities = this.removeAll(filterFunction);

    entities.forEach(entity => {
      if (entity.instance.destroy) {
        entity.instance.destroy();
      }
    });
  }

  /**
   * Retrieve all entities that belong to the specified collection.
   *
   * @param {string} collectionName - collection to retrieve
   * @returns {Entity[]}
   */
  getCollection(collectionName) {
    return this.collections[collectionName];
  }

  /**
   * Retrieve the Phaser.Group of the specified name.
   *
   * @param {string} name - group to retrieve
   * @returns {Phaser.Group}
   */
  getGroup(name) {
    return this.groups[name];
  }
}

export default EntityService;
