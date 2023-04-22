import { useMemo } from 'react';
import SpriteSheet from '../../SpriteSheet';

const useSpriteSheet = ({ sheet, tileWidth, tileHeight, scale }) => {
  const createSprite = useMemo(() => {
    return new SpriteSheet({
      sheet,
      tileWidth,
      tileHeight,
      scale,
    });
  }, [sheet, tileWidth, tileHeight, scale]);

  return createSprite;
};

export default useSpriteSheet;
