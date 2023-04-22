import path from 'path';

const ROOT_IMAGE_DIR = path.join('images', 'nav_map');
const MAP_NAME = 'star_map.json';
const RELATIVE_MAP_PATH = path.join(ROOT_IMAGE_DIR, MAP_NAME);

const ASSETS = [
  ['controlBox', 'ControlBox_9slice.png'],
  ['destSelectBox', 'SelectDestinationBox.png'],
  ['controlBoxArrows', 'ControlBox_ArrowButtons.png'],
  ['controlBoxPlanetName', 'ControlBox_PlanetName.png'],
  ['controlBoxRadioButton', 'ControlBox_SelectionLights.png'],
  ['buttonExit', 'ExitButton.png'],
  ['buttonGo', 'GoButton.png'],
  ['descBorderOuter', 'DescriptionBorder_Outer.png'],
  ['descBorderInner', 'DescriptionBorder_Inner.png'],
  ['bgStars', 'star_map_bg.png'],
].map(([key, relativePath]) => [key, path.join(ROOT_IMAGE_DIR, relativePath)]);

export { ASSETS, RELATIVE_MAP_PATH };
