import path from 'path';
import {
  readFile,
  resolveAbsolutePath,
  getOwningExtensionName,
  getPathRelativeToOwningExtension,
} from './assetLoader';
import { BUNDLED_ASSET_DIRECTORY, getExtensionDirectory } from './extensions';

function isTilesetExternal(tileset) {
  return Boolean(tileset.source);
}

function getRelativeTilesetId(phaserGid, firstgid) {
  return phaserGid - firstgid;
}

function isPhaserGidInTileset(
  phaserGid,
  { image, firstgid, tilecount, tiles = [] }
) {
  if (image) {
    // This tileset is built from a single tiled image, check if gid
    // is in range
    return phaserGid >= firstgid && phaserGid < firstgid + tilecount;
  }

  const relativeTilesetId = getRelativeTilesetId(phaserGid, firstgid);

  return tiles.some(tile => tile.id === relativeTilesetId);
}

function getPhaserKeyFromImagePath(imagePath) {
  const baseName = path.basename(imagePath);
  const [key] = baseName.split('.');

  return key;
}

class TiledService {
  mapPath = '';
  mapData;
  externalTilesets = [];
  layers = [];

  async registerMapFile(mapPath) {
    this.mapPath = mapPath;

    const fileContents = await readFile(mapPath);

    if (!fileContents) {
      console.error(`The mapPath "${mapPath}" does not exist. Skipping load.`);
      return;
    }

    try {
      this.mapData = JSON.parse(fileContents);
    } catch (error) {
      console.error(
        `The mapPath "${mapPath}" contains invalid JSON. Skipping load.`
      );
      return;
    }

    const { tilesets, layers } = this.mapData;

    const tilesetPromises = tilesets.map(this.processTilesets.bind(this));
    this.externalTilesets = await Promise.all(tilesetPromises);

    this.layers = layers.map(this.processLayer.bind(this));
  }

  getLayers(filter = () => true) {
    return this.layers.filter(filter);
  }

  processLayer({ type, name, properties = [] }) {
    const layer = {
      name,
      type,
      instance: {},
      properties: properties.reduce((properties, property) => {
        return {
          ...properties,
          [property.name]: property.value,
        };
      }, {}),
    };

    return layer;
  }

  async processTilesets(tileset) {
    if (!isTilesetExternal(tileset)) {
      // tileset is already embedded
      return tileset;
    }

    let tilesetData;

    // If a tileset's source contains ".bundled" we expect
    // it to be looked up with assetLoader's readFile.
    let relativePath;
    let extensionName;

    if (tileset.source.includes(BUNDLED_ASSET_DIRECTORY)) {
      [, relativePath] = tileset.source.split(`${BUNDLED_ASSET_DIRECTORY}/`);
    } else {
      // Tiled stores tileset source paths relative to the map that includes
      // them. We need to find the absolute location of our map in order to
      // find the tileset relative to it.
      const absoluteMapPath = await resolveAbsolutePath(this.mapPath);

      // Since the tileset is relative to the map, we will join absolute path
      // with the tileset's source. We need to go up one extra directory to be
      // correctly referencing the root of the extension.
      const absoluteTilePath = path.join(absoluteMapPath, '..', tileset.source);

      extensionName = await getOwningExtensionName(absoluteTilePath);
      relativePath = await getPathRelativeToOwningExtension(absoluteTilePath);

      console.warn(
        `Tileset "${tileset.source}" from "${extensionName}" is not referencing .bundled data. This will likely cause an error when this tileset is distributed as an extension. If you're referencing an image outside your extension this will break.`
      );
    }

    if (!relativePath) {
      throw new Error(`
        Could not find an owning extension for the source of 
        this tileset:
        ${tileset.source}
      `);
    }

    const tilesetContents = await readFile(relativePath);

    if (!tilesetContents) {
      throw new Error(`
          Failed to find a tileset file from map file.

          Source path in map file:
          ${tileset.source}

          Calculated relativePath to extensions directory:
          ${relativePath}
        `);
    }

    try {
      tilesetData = JSON.parse(tilesetContents);
    } catch (err) {
      throw new Error(`
        Failed to parse tileset's JSON contents.

        Source path in map file:
        ${tileset.source}

        Calculated relativePath to extensions directory:
        ${relativePath}

        ${err}
      `);
    }

    // Embedded tilesets must not have "source" property
    const { source, ...remainigTileset } = tileset;

    return {
      ...remainigTileset,
      ...tilesetData,
    };
  }

  getTileData(phaserGid) {
    const tiledId = this.convertPhaserGidToTiledId(phaserGid);
    const tileset = this.getTilesetFromGid(phaserGid);

    const externalTileset = this.getTilesetData(tileset.name);

    if (!externalTileset.tiles) {
      // this tileset has no special configured tile data
      return {};
    }

    const tileData = externalTileset.tiles.find(tile => tile.id === tiledId);

    return tileData ? pruneEmptyStringProperties(tileData) : {};
  }

  getTilesetData(tilesetName) {
    return this.externalTilesets.find(tileset => tileset.name === tilesetName);
  }

  getMapData() {
    return {
      ...this.mapData,
      tilesets: this.externalTilesets,
    };
  }

  convertPhaserGidToTiledId(phaserGid) {
    const tileset = this.getTilesetFromGid(phaserGid);

    if (!tileset) {
      throw new Error(
        `No tileset was found for phaserGid: ${phaserGid}. For map: ${this.mapPath}.`
      );
    }

    if (!tileset.firstgid) {
      throw new Error(
        `Tileset doesn't have firstgid property. phaserGid: ${phaserGid}`,
        tileset
      );
    }

    return getRelativeTilesetId(phaserGid, tileset.firstgid);
  }

  getTilesetFromGid(phaserGid) {
    const { tilesets } = this.getMapData();

    const tileset = tilesets.find(tileset =>
      isPhaserGidInTileset(phaserGid, tileset)
    );

    return tileset;
  }

  getImageKeyFromGid(phaserGid) {
    const tileset = this.getTilesetFromGid(phaserGid);

    if (tileset.image) {
      return getPhaserKeyFromImagePath(tileset.image);
    }

    const relativeTilesetId = getRelativeTilesetId(phaserGid, tileset.firstgid);

    const { image } = tileset.tiles.find(
      tiles => tiles.id === relativeTilesetId
    );

    return getPhaserKeyFromImagePath(image);
  }
}

export default new TiledService();

function pruneEmptyStringProperties(object) {
  return Object.entries(object).reduce(
    (prunedObject, [currentPropKey, currentPropValue]) => {
      if (currentPropValue === '') {
        return prunedObject;
      }

      return {
        ...prunedObject,
        [currentPropKey]: currentPropValue,
      };
    },
    {}
  );
}
