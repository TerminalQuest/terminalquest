import React, { useRef, useState, useEffect } from 'react';
import { Transition } from 'react-transition-group';
import { setContext } from '../../../common/context';
import ga from '../../../common/analytics';
import { ASSETS, RELATIVE_MAP_PATH } from '../assets';
import useTiledMap from '../hooks/useTiledMap';
import useAssetLoader, { AssetLoaderProvider } from '../hooks/useAssetLoader';
import Planet from './Planet';
import NineSlice from './NineSlice';
import ControlPanel from './ControlPanel';
import Canvas from './Canvas';
import useMissions from '../hooks/useMissions';
import { clamp } from '../utils';
import ParallaxLayer from './ParallaxLayer';

const buildParallaxLayerId = index => `tq-parallax-${index}`;

const withAssetLoader = WrappedComponent => {
  return ({ ...props }) => (
    <AssetLoaderProvider assetPaths={ASSETS}>
      <WrappedComponent {...props} />
    </AssetLoaderProvider>
  );
};

const NavMap = ({ hide, displayFsmState, finishTransition }) => {
  const {
    backgroundColor,
    isLoaded: isNavMapLoaded,
    getLayers,
    getDimensions,
    loadAssets,
    getTile,
  } = useTiledMap(RELATIVE_MAP_PATH);
  const {
    isLoaded: areAssetsLoaded,
    assets,
    addAsset,
    addAssets,
  } = useAssetLoader();
  const [selectedKey, setSelectedKey] = useState();
  const [nextSelectedKey, setNextSelectedKey] = useState();
  const [panelsAnimatedIn, setPanelsAnimatedIn] = useState(false);
  const [showing, setShowing] = useState(true);

  // unloaded, unloading, loading, loaded
  const [levelLoadingState, setLevelLoadingState] = useState('unloaded');
  const { isLoaded: areMissionsLoaded, missions } = useMissions();

  const [selectedPlanetNode, setSelectedPlanetNode] = useState();
  const descriptionRef = useRef();

  useEffect(() => {
    ga.pageview('/nav-map', 'Navigation Map');
  }, []);

  useEffect(() => {
    if (isNavMapLoaded) {
      loadAssets(addAssets);
    }
  }, [isNavMapLoaded]);

  /**
   * Ryan Kubik - 7/14/22
   * The overlay display state FSM was added after the NavMap was
   * implemented. It is not using any of these new features. This
   * useEffect just lets all transition effects auto-complete any
   * transitions since the NavMap manages its own right now.
   */
  useEffect(() => {
    finishTransition();
  }, [displayFsmState]);

  const planets = [];
  missions &&
    missions.forEach(mission => {
      if (Boolean(mission.navMap)) {
        planets.push(mission);
      }
    });

  planets.sort((a, b) => a.priority - b.priority);

  useEffect(() => {
    const mouseMoveListener = e => {
      const halfWidth = window.innerWidth / 2;
      const halfHeight = window.innerHeight / 2;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const relativeMouseX = 50 - (mouseX - halfWidth);
      const relativeMouseY = 50 - (mouseY - halfHeight);

      getLayers().forEach((layer, index) => {
        const layerId = buildParallaxLayerId(index);
        const layerDiv = document.getElementById(layerId);

        const scrollFactorProp = layer.properties.find(
          prop => prop.name === 'scrollFactor'
        );
        const scrollFactor = scrollFactorProp.value;

        const layerX = `${relativeMouseX * scrollFactor}%`;
        const layerY = `${relativeMouseY * scrollFactor}%`;

        layerDiv.style.left = layerX;
        layerDiv.style.top = layerY;
      });
    };

    if (isNavMapLoaded) {
      document.addEventListener('mousemove', mouseMoveListener);
    }

    return () => document.removeEventListener('mousemove', mouseMoveListener);
  }, [isNavMapLoaded, getLayers]);

  const go = () => {
    if (!selectedKey) {
      return;
    }

    let planet = null;
    planets.forEach(p => {
      if (p.levelName === selectedKey) {
        planet = p;
      }
    });

    if (planet) {
      // Load the requested level
      setContext({
        currentLevel: planet,
      });

      // close UI
      setContext({ overlayComponent: 'fogOwlFlying' });
    }
  };

  const getCurrentLevelTitle = () => {
    const selectedMission = missions.find(
      mission => mission.levelName === selectedKey
    );

    if (selectedMission) {
      return selectedMission.title;
    }

    if (!nextSelectedKey) {
      if (planets.length === 0) return 'No Destinations...';
      else return 'Navigation Loading...';
    }

    return '...';
  };

  const getCurrentLevelDescription = () => {
    const selectedMission = missions.find(
      mission => mission.levelName === selectedKey
    );

    if (selectedMission) {
      return selectedMission.description;
    }

    if (planets.length === 0) return 'No intelligence report to assign...';
    else return 'Loading intelligence report...';
  };

  const selectPlanet = levelKey => {
    setNextSelectedKey(levelKey);

    if (levelLoadingState === 'loaded' || levelLoadingState === 'loading') {
      setLevelLoadingState('unloading');
    } else {
      setLevelLoadingState('unloaded');
    }
  };

  // TODO: this should probably be some kind of async response
  // to the unloading finishing instead of a useEffect
  // like this...
  useEffect(() => {
    if (levelLoadingState === 'unloaded' && nextSelectedKey) {
      setSelectedKey(nextSelectedKey);
      setNextSelectedKey();
      setLevelLoadingState('loaded');
    }
  }, [nextSelectedKey, levelLoadingState]);

  useEffect(() => {
    if (
      areMissionsLoaded &&
      panelsAnimatedIn &&
      !selectedKey &&
      planets.length > 0
    ) {
      selectPlanet(planets[0].levelName);
    }
  }, [areMissionsLoaded, panelsAnimatedIn]);

  useEffect(() => {
    const reDrawOnResize = () => selectPlanet(selectedKey);

    window.addEventListener('resize', reDrawOnResize);

    return () => window.removeEventListener('resize', reDrawOnResize);
  }, [selectedKey]);

  return (
    <Transition
      in={showing}
      timeout={showing ? 500 : 1000} // fadeIn is using animate__faster
    >
      {state => (
        <div
          className={`animate__animated ${
            state === 'entering' || state === 'entered'
              ? 'animate__faster animate__fadeIn'
              : 'animate__fadeOut'
          }`}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: isNavMapLoaded ? backgroundColor : 'transparent',
            display: 'grid',
            gridTemplateAreas: `
              "map map info"
              "map map info"
              "bar bar bar"
            `,
            gridTemplateColumns: '1fr 1fr auto',
            gridTemplateRows: '1fr 1fr auto',
          }}
        >
          {areAssetsLoaded && isNavMapLoaded && areMissionsLoaded && (
            <>
              {getLayers().map((layer, index) => {
                const layerId = buildParallaxLayerId(index);

                return (
                  <ParallaxLayer
                    layer={layer}
                    layerId={layerId}
                    key={layerId}
                    getTile={getTile}
                    dimensions={getDimensions()}
                  />
                );
              })}
              <div
                style={{
                  gridArea: 'map',
                  position: 'relative',
                }}
              >
                <div>
                  {planets.map(planet => {
                    const { navMap } = planet;

                    const topPercent = clamp(navMap.y, 0, 100);
                    const leftPercent = clamp(navMap.x, 0, 100);

                    let frameRow = 0;

                    const isSelected = selectedKey === planet.levelName;

                    const tileWidth = navMap.tileWidth || 48;
                    const tileHeight = navMap.tileHeight || 48;
                    const planetScale = navMap.scale || 1.5;

                    return (
                      <div
                        key={`${planet.levelName}`}
                        style={{
                          position: 'absolute',
                          top: `${topPercent}%`,
                          left: `${leftPercent}%`,
                          zIndex: isSelected ? 1 : 'inherit',
                        }}
                      >
                        <Planet
                          frameRow={frameRow}
                          config={{
                            sheet: navMap.spritePath,
                            tileWidth,
                            tileHeight,
                            scale: planetScale,
                          }}
                          isSelected={isSelected}
                          ref={newRef => {
                            if (isSelected) {
                              setSelectedPlanetNode(newRef);
                            }
                          }}
                          onClick={() => {
                            selectPlanet(planet.levelName);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <Canvas
                  selectedPlanetNode={selectedPlanetNode}
                  descriptionRef={descriptionRef}
                  levelLoadingState={levelLoadingState}
                  setLevelLoadingState={setLevelLoadingState}
                />
              </div>
              <Transition
                in={showing}
                timeout={1000} // this is default value for animate__animated
                onExited={hide}
              >
                {state => (
                  <div
                    className={`animate__animated ${
                      state === 'entering' || state === 'entered'
                        ? 'animate__bounceInRight'
                        : 'animate__bounceOutRight'
                    }`}
                    style={{
                      gridArea: 'info',
                      padding: '32px',
                      width: '40vw',
                      lineHeight: '1.5',
                    }}
                    onAnimationEnd={() => setPanelsAnimatedIn(true)}
                  >
                    <NineSlice
                      ref={descriptionRef}
                      imageUrl={assets.descBorderOuter}
                      containerClassNames="description-box__outer"
                    >
                      <h1
                        style={{
                          margin: '-10px 0 10px 0',
                          fontSize: '18px',
                          textAlign: 'center',
                          lineHeight: '1.6em',
                        }}
                      >
                        {getCurrentLevelTitle()}
                      </h1>
                      <NineSlice imageUrl={assets.descBorderInner}>
                        <p
                          className="human-readable"
                          style={{
                            position: 'absolute',
                            top: '5px',
                            left: '20px',
                            right: '20px',
                            bottom: '10px',
                            paddingRight: '10px',
                            overflow: 'auto',
                          }}
                        >
                          {getCurrentLevelDescription()}
                        </p>
                      </NineSlice>
                    </NineSlice>
                  </div>
                )}
              </Transition>
              <Transition
                in={showing}
                timeout={1000} // this is default value for animate__animated
              >
                {state => (
                  <div
                    className={`animate__animated ${
                      state === 'entering' || state === 'entered'
                        ? 'animate__bounceInUp'
                        : 'animate__bounceOutDown'
                    }`}
                    style={{
                      gridArea: 'bar',
                      margin: '32px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <ControlPanel
                      hide={() => {
                        setShowing(false);
                      }}
                      go={go}
                      planets={planets}
                      selectedKey={selectedKey}
                      currentLevelTitle={getCurrentLevelTitle()}
                      selectPlanet={selectPlanet}
                    />
                  </div>
                )}
              </Transition>
            </>
          )}
        </div>
      )}
    </Transition>
  );
};

export default withAssetLoader(NavMap);
