import React, { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import useAssetLoader, {
  AssetLoaderProvider,
} from './nav_map/hooks/useAssetLoader';
import { ASSETS } from './elevator_interface/assets';
import NineSlice from './nav_map/components/NineSlice';
import NavMapButton from './nav_map/components/NavMapButton';

const withAssetLoader = WrappedComponent => {
  return ({ ...props }) => (
    <AssetLoaderProvider assetPaths={ASSETS}>
      <WrappedComponent {...props} />
    </AssetLoaderProvider>
  );
};

const FloorTitle = ({ title }) => {
  const { assets } = useAssetLoader();

  return (
    <NineSlice
      imageUrl={assets.floorTitleNineSlice}
      config={{
        sourceSize: 6,
        contentPadding: 12,
        backgroundBorderSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '12px',
            flex: 1,
          }}
        >
          {title}
        </h2>
        <NavMapButton
          config={{
            sheet: assets.completedCheckBox,
            tileWidth: 15,
            tileHeight: 14,
            scale: 2,
          }}
        />
      </div>
    </NineSlice>
  );
};

const FloorDescription = ({ description }) => {
  const { assets } = useAssetLoader();

  return (
    <NineSlice
      imageUrl={assets.descriptionBoxNineSlice}
      containerClassNames="elevator-description-box"
      config={{
        sourceSize: 8,
        contentPadding: 16,
        backgroundBorderSize: 16,
      }}
    >
      <p className="human-readable" style={{ margin: 0 }}>
        {description}
      </p>
    </NineSlice>
  );
};

const FloorEntry = ({
  title,
  description,
  shouldShowDescription,
  isSelected,
  onTitleClick,
  onSelectClick,
}) => {
  const { assets } = useAssetLoader();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'start',
        margin: '12px',
      }}
    >
      <div style={{ width: '100%', cursor: 'pointer' }} onClick={onTitleClick}>
        <FloorTitle title={title} />
        {shouldShowDescription && (
          <FloorDescription description={description} />
        )}
      </div>
      <NavMapButton
        onClick={onSelectClick}
        config={{
          sheet: assets.elevatorButton,
          tileWidth: 24,
          tileHeight: 24,
          scale: 2,
          raisedFrame: { row: 0, col: isSelected ? 1 : 0 },
        }}
      />
    </div>
  );
};

/**
 * @type {Object} FloorEntry
 * @prop {String} title - Plain text description of this floor
 * @prop {String} description - Plain text description of this floor
 * @prop {Function} onSelect - Callback invoked when the player clicks the
 *                             button associated with this floor
 */

/**
 *
 * @param {Object} props
 * @param {Array<FloorEntry>} props.floors
 * @returns
 */
const DevFundamentalsElevator = ({
  hide,
  displayFsmState,
  finishTransition,
  fadeIn = false,
  fadeOut = false,
  floors = [],
}) => {
  const { isLoaded: areAssetsLoaded, assets } = useAssetLoader();

  const [selectedFloorIndex, setSelectedFloorIndex] = useState();
  const [selectedFloorCallback, setSelectedFloorCallback] = useState();
  const [describedFloorIndex, setDescribedFloorIndex] = useState(0);

  useEffect(() => {
    if (displayFsmState === 'showing') {
      // We do not need a custom transition in
      finishTransition();
    }
  }, [displayFsmState]);

  if (!areAssetsLoaded) {
    return null;
  }

  const fadeInClassName = fadeIn ? 'animate__faster fade-bg-in' : '';
  const fadeOutClassName = fadeOut ? 'animate__faster fade-bg-out' : '';

  const getAnimationClass = transitionState => {
    const isAnyFloorSelected = selectedFloorIndex !== undefined;

    if (isAnyFloorSelected && displayFsmState === 'hiding') {
      return 'fade-bg-out-from-black';
    }

    if (isAnyFloorSelected) {
      return 'fade-bg-to-black';
    }

    switch (transitionState) {
      case 'entering':
      case 'entered':
        return fadeInClassName;
        return;
      case 'exiting':
        return fadeOutClassName;
      case 'exited':
        return;
    }
  };

  const isShowing =
    displayFsmState === 'showing' || displayFsmState === 'shown';

  return (
    <Transition
      in={isShowing}
      timeout={{
        enter: 1000,
        exit: 500,
      }}
      onExited={hide}
    >
      {state => (
        <div
          className={`dev-fundamentals-elevator  animate__animated ${getAnimationClass(
            state
          )}`}
          onAnimationEnd={event => {
            if (event.animationName === 'fadeBgToBlack') {
              selectedFloorCallback();
            }

            if (displayFsmState === 'hiding') {
              finishTransition();
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Transition
            in={isShowing}
            timeout={1000} // this is default value for animate__animated
            onExited={hide}
          >
            {state => (
              <div
                className={`animate__animated ${
                  state === 'entering' || state === 'entered'
                    ? 'animate__bounceInUp'
                    : 'animate__bounceOutDown'
                }`}
                style={{
                  gridArea: 'info',
                  padding: '32px',
                  width: '60vw',
                  lineHeight: '1.5',
                }}
                // onAnimationEnd={() => setPanelsAnimatedIn(true)}
              >
                <NineSlice
                  // ref={descriptionRef}
                  imageUrl={assets.descriptionBorderOuter}
                  containerClassNames="description-box__outer"
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      margin: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        lineHeight: '1.6em',
                        flex: 1,
                      }}
                    >
                      {'Floor Directory'}
                    </h1>
                    <NavMapButton
                      onClick={hide}
                      config={{
                        sheet: assets.buttonX,
                        tileWidth: 15,
                        tileHeight: 15,
                        scale: 2,
                      }}
                    />
                  </div>
                  <NineSlice imageUrl={assets.descriptionBorderInner}>
                    {floors.map(({ title, description, onSelect }, index) => {
                      return (
                        <FloorEntry
                          key={index}
                          title={title}
                          description={description}
                          onTitleClick={() => {
                            setDescribedFloorIndex(index);
                          }}
                          onSelectClick={() => {
                            setSelectedFloorIndex(index);
                            setSelectedFloorCallback(() => onSelect);
                          }}
                          shouldShowDescription={describedFloorIndex === index}
                          isSelected={selectedFloorIndex === index}
                        />
                      );
                    })}
                  </NineSlice>
                </NineSlice>
              </div>
            )}
          </Transition>
        </div>
      )}
    </Transition>
  );
};

export default withAssetLoader(DevFundamentalsElevator);
