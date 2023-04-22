import React from 'react';
import useAssetLoader from '../hooks/useAssetLoader';
import { getByIndexWithWrapping } from '../utils';
import DestinationSelectLabel from './DestinationSelectLabel';
import LevelSelect from './LevelSelect';
import NavMapButton from './NavMapButton';
import NineSlice from './NineSlice';

const ControlPanel = ({
  hide,
  go,
  planets,
  selectedKey,
  selectPlanet,
  currentLevelTitle,
}) => {
  const { assets } = useAssetLoader();

  return (
    <NineSlice
      imageUrl={assets.controlBox}
      containerClassNames="nav-map__control-panel"
      contentClassNames="nine-slice__content--row"
    >
      <NavMapButton
        onClick={hide}
        config={{
          sheet: assets.buttonExit,
          tileWidth: 90,
          tileHeight: 44,
          scale: 2,
        }}
      />
      <DestinationSelectLabel assets={assets} />
      <LevelSelect
        assets={assets}
        selectedKey={selectedKey}
        currentLevelTitle={currentLevelTitle}
        planets={planets}
        selectNext={() => {
          const selectedIndex = planets.findIndex(
            planet => planet.levelName === selectedKey
          );

          const newPlanet = getByIndexWithWrapping(selectedIndex + 1, planets);

          if (newPlanet) selectPlanet(newPlanet.levelName);
        }}
        selectPrev={() => {
          const selectedIndex = planets.findIndex(
            planet => planet.levelName === selectedKey
          );

          const newPlanet = getByIndexWithWrapping(selectedIndex - 1, planets);

          if (newPlanet) selectPlanet(newPlanet.levelName);
        }}
        selectPlanet={selectPlanet}
      />
      <NavMapButton
        onClick={go}
        config={{
          sheet: assets.buttonGo,
          tileWidth: 75,
          tileHeight: 44,
          scale: 2,
        }}
      />
    </NineSlice>
  );
};

export default ControlPanel;
