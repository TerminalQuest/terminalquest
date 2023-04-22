import React, { useState, useEffect, useMemo } from 'react';
import useAssetLoader from '../hooks/useAssetLoader';
import useSpriteSheet from '../hooks/useSpriteSheet';
import { randIntBetween, clamp } from '../utils';

const convertFrameToRowCol = (frame, columnCount) => {
  const nonZeroColumnCount = clamp(columnCount, 1, Infinity);

  const row = Math.floor(frame / nonZeroColumnCount);
  const col = frame % nonZeroColumnCount;

  return { row, col };
};

const convertRowColToFrame = (rowCol, columnCount) => {
  return rowCol.row * columnCount + rowCol.col;
};

const hasAnimation = properties => {
  return (
    properties.animationStartFrame !== undefined &&
    properties.animationEndFrame !== undefined &&
    properties.animationFrameRate !== undefined
  );
};

const useAnimation = properties => {
  const [currentFrame, setCurrentFrame] = useState(
    randIntBetween(properties.animationStartFrame, properties.animationEndFrame)
  );
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!animating && hasAnimation(properties)) {
      return;
    }

    const interval = setInterval(() => {
      const nextFrame = clamp(
        (currentFrame + 1) % properties.animationEndFrame,
        properties.animationStartFrame,
        properties.animationEndFrame
      );

      if (nextFrame === properties.animationStartFrame) {
        // if back to start frame, end animation
        clearInterval(interval);
        setAnimating(false);
      }

      setCurrentFrame(nextFrame);
    }, 1000 / properties.animationFrameRate);

    return () => clearInterval(interval);
  }, [currentFrame, animating]);

  const start = () => {
    setAnimating(true);
  };

  return {
    currentFrame,
    animating,
    start,
  };
};

const NavMapDecoration = ({
  frame,
  imagePath,
  tileWidth,
  tileHeight,
  scale,
  properties = {},
  position,
  tilesetColumnCount,
}) => {
  const { assets } = useAssetLoader();
  const createSprite = useSpriteSheet({
    sheet: assets[imagePath],
    tileWidth,
    tileHeight,
    scale,
  });
  const { currentFrame, animating, start } = useAnimation(properties);

  useEffect(() => {
    let timeout;

    if (hasAnimation(properties) && !animating) {
      const randomDelay = randIntBetween(
        properties.animationMinDelay || 0,
        properties.animationMaxDelay || 0
      );

      timeout = setTimeout(() => {
        start();
      }, randomDelay);
    }

    return () => clearTimeout(timeout);
  }, [animating]);

  return (
    <div style={{ position: 'absolute', left: position.x, top: position.y }}>
      {createSprite(
        hasAnimation(properties)
          ? convertFrameToRowCol(currentFrame, tilesetColumnCount)
          : frame
      )}
    </div>
  );
};

export default NavMapDecoration;
