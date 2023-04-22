import path from 'path';

const ROOT_IMAGE_DIR = path.join('images', 'elevator_directory');

const ASSETS = [
  ['completedCheckBox', 'Completed_CheckBox.png'],
  ['descriptionBorderInner', 'DescriptionBorder_Inner.png'],
  ['descriptionBorderOuter', 'DescriptionBorder_Outer.png'],
  ['descriptionBoxNineSlice', 'DescriptionBox_9Slice.png'],
  ['elevatorButton', 'Elevator_Button.png'],
  ['floorDivider', 'FloorDivider_3x1tiles.png'],
  ['floorTitleNineSlice', 'FloorTitle_9Slice.png'],
  ['scrollBoxFrame', 'SettingsUI_ScrollBox_Frame.png'],
  ['scrollBoxIndicator', 'SettingsUI_ScroolBox_Indicator_Extendable.png'],
  ['buttonX', 'SettingsUI_XButton.png'],
].map(([key, relativePath]) => [key, path.join(ROOT_IMAGE_DIR, relativePath)]);

export { ASSETS };
