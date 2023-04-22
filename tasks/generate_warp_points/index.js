const jetpack = require('fs-jetpack');
const path = require('path');
const {
  readLevels,
  readLevelInfoFile,
  isMission,
  writeLevelInfoFile,
} = require('./readLevels');

function getMaps(mission) {
  // console.log(mission);
  return mission.maps;
}

function findObjectLayer(map) {
  return map.data.layers.find(layer => layer.name === 'Objects');
}

function findPlayerEntryPoints(layer) {
  return layer.objects.filter(object => object.type === 'player');
}

readLevels().then(levels => {
  // console.log(missions.map(mission => mission && mission.levelName));

  const missions = levels.filter(isMission);

  missions.forEach(async mission => {
    const warpPoints = [];
    const maps = getMaps(mission);

    maps.forEach(map => {
      const objectLayer = findObjectLayer(map);
      const playerEntryPoints = findPlayerEntryPoints(objectLayer).filter(
        entryPoint => {
          // remove default entry point to mission
          if (
            entryPoint.name === 'player_entry1' &&
            (map.mapName === 'default' || map.mapName === 'map')
          ) {
            return false;
          }

          return true;
        }
      );

      playerEntryPoints.forEach(entryPoint => {
        warpPoints.push({
          name: entryPoint.name,
          description: 'Warping gets you where you need to go faster...',
          levelMapName: map.mapName,
          playerEntryPoint: entryPoint.name,
          prereqs: [],
          disabled: false,
          secret: false,
        });
      });
    });

    const levelInfo = await readLevelInfoFile(mission.levelName);

    const existingWarpPoints = levelInfo.warpPoints || [];
    const isWarpPointNew = (newWarpPoint, existingWarpPoints) => {
      return !existingWarpPoints.find(existingWarpPoint => {
        // if existing warp point goes to same entry point, its already added
        return (
          existingWarpPoint.playerEntryPoint ===
            newWarpPoint.playerEntryPoint &&
          existingWarpPoint.levelMapName === newWarpPoint.levelMapName
        );
      });
    };
    const newWarpPoints = warpPoints.filter(newWarpPoint =>
      isWarpPointNew(newWarpPoint, existingWarpPoints)
    );

    if (newWarpPoints.length) {
      console.log(
        `Adding "${newWarpPoints.length}" new Warp Points to: "${
          mission.levelName
        }"`
      );
    }

    levelInfo.warpPoints = [...newWarpPoints, ...existingWarpPoints];

    writeLevelInfoFile(mission.levelName, levelInfo);
  });
});
