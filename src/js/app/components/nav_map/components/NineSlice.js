import React, { forwardRef } from 'react';

const NineSlice = forwardRef(
  (
    {
      children,
      imageUrl,
      contentClassNames = '',
      containerClassNames = '',
      config = {},
    },
    ref
  ) => {
    const {
      // this relates to source nine slice image file
      sourceSize = NineSlice.DEFAULT_SOURCE_SIZE,
      // how much visual padding to use for content
      contentPadding = NineSlice.DEFAULT_CONTENT_PADDING,
      // scale of the nine slice image
      backgroundBorderSize = NineSlice.DEFAULT_BACKGROUND_BORDER_SIZE,
    } = config;

    return (
      <div
        ref={ref}
        className={`nine-slice__container ${containerClassNames}`}
        style={{
          minHeight: `${backgroundBorderSize * 2}px`,
          minWidth: `${backgroundBorderSize * 2}px`,
        }}
      >
        <div
          className="nine-slice__background"
          style={{
            borderImage: `url("${imageUrl}")`,
            borderImageSlice: `${sourceSize} fill`,
            borderWidth: `${backgroundBorderSize}px`,
          }}
        ></div>
        <div
          className={`nine-slice__content ${contentClassNames}`}
          style={{
            padding: `${contentPadding}px`,
            minHeight: `${backgroundBorderSize * 2}px`,
            minWidth: `${backgroundBorderSize * 2}px`,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
NineSlice.DEFAULT_SOURCE_SIZE = 24;
NineSlice.DEFAULT_CONTENT_PADDING = 32;
NineSlice.DEFAULT_BACKGROUND_BORDER_SIZE = 64;

export default NineSlice;
