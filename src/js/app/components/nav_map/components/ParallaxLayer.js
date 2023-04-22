import React, { useMemo } from 'react';
import NavMapDecoration from './NavMapDecoration';

const ParallaxLayer = ({ layer, layerId, getTile, dimensions }) => {
  const objects = useMemo(() => {
    return layer.objects.map((object, index) => {
      const tile = getTile(object.gid);

      if (Math.random() > 0.5) tile.properties.animationMaxDelay = 0;

      // Calculate percentage x position
      const windowToMapRatioWidth = window.innerWidth / dimensions.width;
      const objectXPositionInPixels = object.x * windowToMapRatioWidth;
      const objectXPositionPercentage =
        (objectXPositionInPixels / window.innerWidth) * 100;
      const x = `${objectXPositionPercentage}%`;

      // Calculate percentage y position
      const windowToMapRatioHeight = window.innerHeight / dimensions.height;
      const objectYPositionInPixels = object.y * windowToMapRatioHeight;
      const objectYPositionPercentage =
        (objectYPositionInPixels / window.innerHeight) * 100;
      const y = `${objectYPositionPercentage}%`;

      return (
        <NavMapDecoration
          key={index}
          frame={tile.frame}
          imagePath={tile.imagePath}
          tileWidth={tile.tileWidth}
          tileHeight={tile.tileHeight}
          properties={tile.properties}
          position={{ x, y }}
          tilesetColumnCount={tile.tilesetColumnCount}
          scale={5}
        />
      );
    });
  }, [layer]);

  return (
    <div
      key={layerId}
      id={layerId}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
      }}
    >
      {objects}
    </div>
  );
};

export default ParallaxLayer;
