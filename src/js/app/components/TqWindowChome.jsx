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

// TODO:
// This component references styles pulled from the Dev Fundamentals
// elevator. We should refactor these styles into a shared generic
// TqWindowChrome set of styles and components.

/**
 *
 * @param {Object} props
 * @param {Array<FloorEntry>} props.floors
 * @returns
 */
const TqWindowChrome = ({
  hide,
  displayFsmState,
  finishTransition,
  fadeIn = false,
  fadeOut = false,
  title,
  children,
  width = '40vw',
  height,
}) => {
  const { isLoaded: areAssetsLoaded, assets } = useAssetLoader();

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
                  width,
                  height,
                  lineHeight: '1.5',
                }}
              >
                <NineSlice
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
                      {title}
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
                    {children}
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

const withTqChrome = ({ children, ...props }) => {
  return <TqWindowChrome {...props}>{children}</TqWindowChrome>;
};

export default withAssetLoader(TqWindowChrome);
export { withTqChrome };
