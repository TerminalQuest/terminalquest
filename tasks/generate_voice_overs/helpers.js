const jetpack = require('fs-jetpack');
const path = require('path');
const { MISSION_DIR } = require('./consts');

const isDir = file => jetpack.exists(`${MISSION_DIR}/${file}`) === 'dir';

function getBaseName(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

module.exports = {
  isDir,
  getBaseName,
};
