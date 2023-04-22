import React, { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';

const FogOwlFlying = ({
  hide,
  displayFsmState,
  finishTransition,
  fadeIn = false,
}) => {
  const [showing, setShowing] = useState(true);

  /**
   * Ryan Kubik - 7/14/22
   * The overlay display state FSM was added after FogOwlFlying was
   * implemented. It is not using any of these new features. This
   * useEffect just lets all transition effects auto-complete any
   * transitions since FogOwlFlying manages its own right now.
   */
  useEffect(() => {
    finishTransition();
  }, [displayFsmState]);

  useEffect(() => {
    setTimeout(() => setShowing(false), 5000);
  }, []);

  return (
    <Transition
      in={showing}
      timeout={{
        enter: 1000,
        exit: 500,
      }}
      onExited={hide}
    >
      {state => (
        <div
          className={`animate__animated ${
            state === 'entering' || state === 'entered'
              ? fadeIn
                ? 'animate__faster animate__fadeIn'
                : ''
              : 'animate__fadeOut'
          }`}
          style={{
            width: '100%',
            height: '100%',
            background: '#111 url(images/app/stars.png)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            className={`animate__animated ${
              state === 'entering' || state === 'entered'
                ? 'animate__slideInLeft'
                : 'animate__faster animate__fadeOutRightBig'
            }`}
          >
            <img
              src="images/app/fog_owl.gif"
              style={{ transform: 'rotate(90deg) scale(1.5)' }}
            />
          </div>
          <p
            style={{
              position: 'absolute',
              bottom: '10px',
              textAlign: 'center',
              color: '#ababab',
              fontSize: '16px',
              fontFamily: '"Roboto Mono", Consolas, monospace',
              textTransform: 'uppercase',
            }}
          >
            Packet transmission drive engaged, please stand by...
          </p>
        </div>
      )}
    </Transition>
  );
};

export default FogOwlFlying;
