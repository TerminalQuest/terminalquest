import path from 'path';
import { useState, useEffect } from 'react';
import { requireFromExtension } from '../../../common/assetLoader';

const reduceTileProps = (properties = []) => {
  return properties.reduce((propsObject, currentProp) => {
    return {
      ...propsObject,
      [currentProp.name]: currentProp.value,
    };
  }, {});
};

const convertFrameToRowCol = (frame, columnCount) => {
  const row = Math.floor(frame / columnCount);
  const col = frame % columnCount;

  return { row, col };
};

const isTilesetImageCollection = tileset => !Boolean(tileset.image);

const useTiledMap = mapPath => {
  const [mapData, setMapData] = useState({});
  const [tilesets, setTilesets] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchMapData = async () => {
      const mapData = await requireFromExtension(mapPath);
      const mapRootPath = path.dirname(mapPath);

      const tilesetPromises = mapData.tilesets.map(async ({ source }) => {
        const tilesetPath = path.join(mapRootPath, source);

        return await requireFromExtension(tilesetPath);
      });
      const tilesetFiles = await Promise.all(tilesetPromises);

      const tilesets = tilesetFiles.map((file, index) => {
        const { firstgid } = mapData.tilesets[index];

        // Image collections will not have the `.image` property
        // only traditional tilesets will.
        const imagePath = file.image
          ? path.join(mapRootPath, file.image)
          : null;

        // For a tileset's tiles, check if a tile has an image property,
        // if so, populate it.
        const tiles = file.tiles.map(tile => {
          const imagePath = tile.image
            ? path.join(mapRootPath, tile.image)
            : null;

          return {
            ...tile,
            imagePath,
          };
        });

        return {
          ...file,
          firstgid,
          imagePath,
          tiles,
        };
      });

      setTilesets(tilesets);
      setMapData(mapData);
      setIsLoaded(true);
    };

    fetchMapData();
  }, [mapPath]);

  const getLayer = name => {
    return mapData.layers.find(layer => layer.name === name);
  };

  const getDimensions = () => {
    return {
      width: mapData.tilewidth * mapData.width,
      height: mapData.tileheight * mapData.height,
    };
  };

  const findTileset = gid => {
    return tilesets.find((tileset, index) => {
      const nextTileset = tilesets[index + 1];
      const nextTilesetFirstGid = (nextTileset && nextTileset.firstgid) ? 
        nextTileset.firstgid : Infinity;

      return gid >= tileset.firstgid && gid < nextTilesetFirstGid;
    });
  };

  const getTile = gid => {
    const tileset = findTileset(gid);

    if (!tileset) {
      console.error(
        `Tiled map "${mapPath}" did not contain a tileset for gid "${gid}".`
      );
      return;
    }

    const tilesetRelativeId = gid - tileset.firstgid;
    let tileInfo = tileset.tiles.find(tile => tile.id === tilesetRelativeId);
    if (!tileInfo) {
      tileInfo = {};
    }

    const imagePath = tileInfo.imagePath ? 
      tileInfo.imagePath : tileset.imagePath;
    const properties = reduceTileProps(tileInfo.properties);
    const frame = isTilesetImageCollection(tileset) ? null : tilesetRelativeId;

    return {
      frame: isTilesetImageCollection(tileset)
        ? {
            // if this tile is from an image collection then there's
            // only one frame
            row: 0,
            col: 0,
          }
        : convertFrameToRowCol(frame, tileset.columns),
      properties,
      imagePath,
      tileWidth: tileInfo.imagewidth ? tileInfo.imagewidth : tileset.tilewidth,
      tileHeight: tileInfo.imageheight ? tileInfo.imageheight : tileset.tileheight,
      tilesetColumnCount: tileset.columns,
    };
  };

  const getLayers = () => {
    return mapData.layers;
  };

  const loadAssets = addAssets => {
    const tilesetImagePaths = [];

    tilesets.forEach(tileset => {
      if (isTilesetImageCollection(tileset)) {
        // load each tile's imagePath
        tileset.tiles.forEach(tile => {
          tilesetImagePaths.push(tile.imagePath);
        });
      } else {
        // load the tileset's imagePath
        tilesetImagePaths.push(tileset.imagePath);
      }
    });

    addAssets(tilesetImagePaths);
  };

  return {
    isLoaded,
    getLayer,
    getLayers,
    getDimensions,
    getTile,
    mapData,
    backgroundColor: mapData.backgroundcolor,
    loadAssets,
  };
};

export default useTiledMap;
