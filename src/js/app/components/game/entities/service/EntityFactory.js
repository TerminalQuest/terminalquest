import merge from 'lodash.merge';

import EntityConfigService from '../../EntityConfigService';
import EntityMap from './EntityMap';
import TiledService from '../../../../common/tiled';

/**
 * Accepts a lens function for accessing the identity of an object.
 * The values of properties are determined from right to left, similar
 * to a lodash merge function.
 *
 * @param {function(a, b)} lens
 * @returns function(...arrays) -> returns Objects[]
 */
const mergeObjectArraysByLens = lens => (...arrays) => {
  const mergedMap = {};

  arrays.forEach(array =>
    array.forEach(obj => {
      const id = lens(obj);

      mergedMap[id] = obj;
    })
  );

  return Object.values(mergedMap);
};

function isObjectPoint(object) {
  return object.rectangle && object.width === 0 && object.height === 0;
}

class EntityFactory {
  constructor(level) {
    this.level = level;
  }

  /**
   * Create and register a new entity from Tiled information
   *
   * @param {Object} rawObject - information pulled from Tiled map layer
   * @returns {Object} returns the instance of the entity that was created
   */
  create(rawObject) {
    let obj = merge({}, rawObject);

    if (EntityConfigService.isTileObject(rawObject)) {
      obj = EntityConfigService.convertFromTileObject(rawObject);

      // TileObjects can pull default properties that were configured on the
      // tileset the object came from. We should merge those with the properties
      // assigned to the object directly by the author.
      const tileData = TiledService.getTileData(rawObject.gid);

      // merge properties array with a little more intelligence
      const mergePropArrays = mergeObjectArraysByLens(prop => prop.name);
      const properties = mergePropArrays(
        tileData.properties || [],
        obj.properties || []
      );

      obj = merge({}, tileData, obj);

      // overwrite the lodash determined merge with our own resolution
      obj.properties = properties;
    }

    obj.type = obj.type && obj.type.trim();

    // If author has provided no type value, determine it ourselves
    if (!obj.type) {
      if (isObjectPoint(obj)) {
        obj.type = 'point';
      } else {
        obj.type = 'tile-object';
      }
    }

    let type, collections, group;

    if (EntityMap[obj.type]) {
      ({ type, collections, group } = EntityMap[obj.type]);
    } else {
      // type is not mapped
      console.warn(
        `Entity type is not mapped: "${obj.type}". Defaulting to "tile-object".`
      );
      ({ type, collections, group } = EntityMap['tile-object']);
    }

    if (obj.type === 'tile-object' && !obj.gid) {
      console.error(
        "This object should have a gid if it's a tile-object. Skipping.",
        obj
      );
      return;
    }

    const instance = new type(this.level, obj);

    this.level.entityService.registerEntity({ instance, collections, group });

    return instance;
  }
}

export default EntityFactory;
