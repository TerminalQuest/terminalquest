import React, { forwardRef, useState } from 'react';
import useMediaQuery from '../hooks/useMediaQuery';
import useSpriteSheet from '../hooks/useSpriteSheet';

const Planet = forwardRef(
  (
    {
      onClick = () => {},
      frameRow = 0,
      config: { sheet, tileWidth, tileHeight, scale },
      isSelected,
    },
    ref
  ) => {
    const [pressed, setPressed] = useState(false);
    const spriteScale = useMediaQuery(width => {
      if (width <= 900) {
        return scale;
      } else if (width > 900 && width < 1800) {
        return scale * 1.5;
      } else {
        return scale * 2;
      }
    });
    const createSprite = useSpriteSheet({
      sheet,
      tileWidth,
      tileHeight,
      scale: spriteScale,
    });

    return (
      <>
        <button
          ref={ref}
          className="nav-map__planet"
          onClick={onClick}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
        >
          {createSprite({ row: frameRow, col: isSelected ? 1 : 0 })}
        </button>
      </>
    );
  }
);

export default Planet;
