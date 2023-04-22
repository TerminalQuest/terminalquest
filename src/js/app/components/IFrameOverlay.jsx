import React, { useEffect, useState } from 'react';
import TqWindowChome from './TqWindowChome';

const IFrameContainer = ({
  children,
  shouldUseTqChrome,
  displayFsmState,
  finishTransition,
  hide,
  title,
  width,
  height,
  fadeIn,
  fadeOut,
}) => {
  const Container = ({ children }) => {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}
      >
        {children}
      </div>
    );
  };

  if (shouldUseTqChrome) {
    return (
      <TqWindowChome
        displayFsmState={displayFsmState}
        finishTransition={finishTransition}
        hide={hide}
        title={title}
        width={width}
        height={height}
        fadeIn={fadeIn}
        fadeOut={fadeOut}
      >
        <Container>{children}</Container>
      </TqWindowChome>
    );
  }

  return <Container>{children}</Container>;
};

const IFrameOverlay = ({
  hide,
  displayFsmState,
  finishTransition,
  url,
  backgroundColor = 'black',
  fontColor = '#00FF00',
  shouldUseTqChrome = false,
  borderless = false,
  title,
  width,
  height,
  fadeIn = false,
  fadeOut = false,
}) => {
  // loading, errored, loaded
  const [validatingUrl, setValidatingUrl] = useState('loading');
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);

  /**
   * Ryan Kubik - 7/14/22
   * The overlay display state FSM was added after IFrameOverlay was
   * implemented. It is not using any of these new features. This
   * useEffect just lets all transition effects auto-complete any
   * transitions since IFrameOverlay manages its own right now.
   */
  useEffect(() => {
    finishTransition();
  }, [displayFsmState]);

  useEffect(() => {
    /**
     * Kick off a fetch to the provided URL to validate that
     * it is a functional URL. The iFrame doesn't give us any
     * feedback about this.
     */
    const fetchUrl = async () => {
      try {
        await fetch(url);
        setValidatingUrl('loaded');
      } catch (err) {
        console.error(
          `Error occurred while trying to load the iframe: ${url}`,
          err
        );
        setValidatingUrl('errored');
      }
    };

    fetchUrl();
  }, []);

  useEffect(() => {
    const messageHandler = event => {
      if (event.data.hide) {
        hide();
      }
    };

    /**
     * This event listener allows the iFramed site to
     * control when the IFrameOverlay is hidden.
     */
    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const shouldShowIframe = !isLoadingIframe && validatingUrl === 'loaded';
  const getMessageText = () => {
    switch (validatingUrl) {
      case 'loading':
        return `Loading... URL: ${url}`;
      case 'errored':
        return `Error loading URL: "${url}"`;
      default:
      case 'loaded':
        return 'Loaded!';
    }
  };

  return (
    <IFrameContainer
      shouldUseTqChrome={shouldUseTqChrome}
      displayFsmState={displayFsmState}
      finishTransition={finishTransition}
      hide={hide}
      title={title}
      width={width}
      height={height}
      fadeIn={fadeIn}
      fadeOut={fadeOut}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: backgroundColor,
          color: fontColor,
          border: borderless ? 'none' : '2px solid white',
        }}
      >
        {!shouldShowIframe ? (
          <div style={{ textAlign: 'center' }}>
            <div>{getMessageText()}</div>
            <button
              onClick={hide}
              style={{ margin: '2rem', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        ) : null}
        {/**
         * We render the iFrame, hidden on the screen before we're
         * sure the URL is valid. It takes some time for the iFrame
         * to load, so we want to start loading it immediately.
         */}
        <iframe
          onLoad={() => {
            setIsLoadingIframe(false);
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            visibility: shouldShowIframe ? 'inherit' : 'hidden',
            position: shouldShowIframe ? 'inherit' : 'absolute',
            pointerEvents: shouldShowIframe ? 'all' : 'none',
          }}
          src={url}
        />
      </div>
    </IFrameContainer>
  );
};

export default IFrameOverlay;
