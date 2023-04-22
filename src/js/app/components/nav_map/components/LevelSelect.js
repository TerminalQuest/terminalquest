import React, { useRef } from 'react';
import useSpriteSheet from '../hooks/useSpriteSheet';
import NavMapButton from './NavMapButton';

const LevelSelect = ({
  assets,
  planets,
  selectedKey,
  currentLevelTitle,
  selectNext,
  selectPrev,
  selectPlanet,
}) => {
  const CONTROL_BOX_SCALE = 3;
  const CONTROL_RADIO_SCALE = 2;
  const CONTROL_ARROW_SCALE = 2;

  const createControlBoxPlanetName = useSpriteSheet({
    sheet: assets.controlBoxPlanetName,
    tileWidth: 23,
    tileHeight: 32,
    scale: CONTROL_BOX_SCALE,
  });
  const createControlBoxRadioButton = useSpriteSheet({
    sheet: assets.controlBoxRadioButton,
    tileWidth: 11,
    tileHeight: 12,
    scale: CONTROL_RADIO_SCALE,
  });

  // const selectedPlanet = planets.find(planet => planet.name === selectedKey);

  return (
    <div>
      <div>
        <div style={{}}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <NavMapButton
              onClick={selectPrev}
              config={{
                sheet: assets.controlBoxArrows,
                tileWidth: 30,
                tileHeight: 24,
                scale: CONTROL_ARROW_SCALE,
                raisedFrame: { row: 1, col: 0 },
                pressedFrame: { row: 1, col: 1 },
              }}
            />
            <div
              className="levelSelect__container"
              style={{
                // marginTop: '-9rem',
                height: `${32 * CONTROL_BOX_SCALE}px`,
                width: `${23 * CONTROL_BOX_SCALE * 5}px`,
                // marginBottom: '2rem',
                marginLeft: '0.5rem',
                marginRight: '0.5rem',
              }}
            >
              <p>{currentLevelTitle}</p>
              <div className="levelSelect__background">
                {createControlBoxPlanetName({ row: 0, col: 0 })}
                {createControlBoxPlanetName({ row: 0, col: 1 })}
                {createControlBoxPlanetName({ row: 0, col: 1 })}
                {createControlBoxPlanetName({ row: 0, col: 1 })}
                {createControlBoxPlanetName({ row: 0, col: 5 })}
              </div>
            </div>
            <NavMapButton
              onClick={selectNext}
              config={{
                sheet: assets.controlBoxArrows,
                tileWidth: 30,
                tileHeight: 24,
                scale: CONTROL_ARROW_SCALE,
                raisedFrame: { row: 0, col: 0 },
                pressedFrame: { row: 0, col: 1 },
              }}
            />
          </div>
          <ul
            style={{
              display: 'flex',
              flexDirection: 'row',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              justifyContent: 'center',
            }}
          >
            {planets.map(planet => (
              <li
                key={planet.levelName}
                style={{
                  margin: '0.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  selectPlanet(planet.levelName);
                }}
              >
                {createControlBoxRadioButton({
                  row: 0,
                  col: selectedKey === planet.levelName ? 1 : 0,
                })}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;
