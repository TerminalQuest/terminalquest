const fs = require('fs').promises;
const path = require('path');
const { readLevels, LEVELS_DIR } = require('./generate_warp_points/readLevels');

readLevels().then(levels => {
  const maps = [];

  levels.forEach(level => {
    if (!level.maps) {
      return;
    }

    const levelPath = path.join(LEVELS_DIR, level.levelName);

    console.log(level.levelName);

    level.maps.forEach(async map => {
      const layers = map.data.layers.map(layer => {
        if (layer.name === 'Collision') {
          const properties = [
            {
              name: 'collision',
              type: 'bool',
              value: true,
            },
            {
              name: 'hidden',
              type: 'bool',
              value: true,
            },
          ];

          return { ...layer, properties };
        }

        // don't change layer
        return layer;
      });

      const mapString = JSON.stringify({ ...map.data, layers }, null, 2);

      if (map.mapName === 'map') {
        // this is old system
        await fs.writeFile(
          path.join(levelPath, 'map.json'),
          mapString,
          'utf-8'
        );
      } else {
        await fs.writeFile(
          path.join(levelPath, 'maps', `${map.mapName}.json`),
          mapString,
          'utf-8'
        );
      }
    });
  });

  //   levels.forEach();
  //   console.log(
  //     levels.map(level => level.maps && level.maps.map(map => map.data.layers))
  //   );
});
