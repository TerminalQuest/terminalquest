import React from 'react';
import fileUrl from 'file-url';

const SpriteContainer = ({ width, height, children, scale }) => {
  const style = {
    width: `${width * scale}px`,
    height: `${height * scale}px`,
  };

  return <div style={style}>{children}</div>;
};

const Sprite = ({ sheet, row, col, width, height, scale }) => {
  let sheetUrl = sheet;
  if (sheetUrl && sheetUrl.indexOf('file:') < 0) {
    sheetUrl = sheet ? fileUrl(sheet) : '';
  }
  const style = {
    background: `url("${sheetUrl}") -${col * width}px -${row * height}px`,
    imageRendering: 'pixelated',
    width: `${width}px`,
    height: `${height}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };

  return <div style={style} />;
};

const SpriteSheet = ({ sheet, tileWidth, tileHeight, scale }) => ({
  row,
  col,
}) => {
  return (
    <SpriteContainer height={tileHeight} width={tileWidth} scale={scale}>
      <Sprite
        height={tileHeight}
        width={tileWidth}
        sheet={sheet}
        row={row}
        col={col}
        scale={scale}
      />
    </SpriteContainer>
  );
};

export default SpriteSheet;
