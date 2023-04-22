import React from 'react';
import { Transition } from 'react-transition-group';

const Canvas = ({
  levelLoadingState,
  setLevelLoadingState,
  selectedPlanetNode,
  descriptionRef,
}) => {
  const startRect = selectedPlanetNode ? 
    selectedPlanetNode.getBoundingClientRect() : null;
  const endRect = (descriptionRef && descriptionRef.current) ? 
    descriptionRef.current.getBoundingClientRect() : null;

  let startPoint = {
    left: 0,
    top: 0,
  };

  if (startRect) {
    startPoint = {
      top: startRect.top + startRect.height / 2,
      left: startRect.right - startRect.width / 4,
    };
  }

  let endPoint = {
    left: 0,
    top: 0,
  };

  if (endRect) {
    endPoint = {
      top: endRect.top + endRect.height / 2,
      left: endRect.left,
    };
  }

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <Transition
        in={levelLoadingState === 'loading' || levelLoadingState === 'loaded'}
        timeout={250}
        onExited={() => setLevelLoadingState('unloaded')}
      >
        {state => (
          <div
            style={{
              position: 'absolute',
              background: '#8EDDEF',
              height: '4px',
              width:
                state === 'entering' || state === 'entered'
                  ? `${endPoint.left - startPoint.left}px`
                  : '0px',
              left: startPoint.left,
              top: startPoint.top,
              transitionProperty: 'width',
              transitionDuration: '250ms',
            }}
          ></div>
        )}
      </Transition>
    </div>
  );
};

export default Canvas;
