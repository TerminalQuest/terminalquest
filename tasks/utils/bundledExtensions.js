const path = require('path');

const bundledModulePath = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'js',
  'app',
  'config',
  'bundledExtensionModules.json'
);
const nodeModulesPath = path.join(
  __dirname,
  '..',
  '..',
  'public',
  'node_modules'
);

function getBundledExtensionNames() {
  return require(bundledModulePath);
}

function getBundledExtensionPaths() {
  return getBundledExtensionNames().map(extensionName =>
    path.join(nodeModulesPath, extensionName)
  );
}

module.exports = {
  getBundledExtensionNames,
  getBundledExtensionPaths,
};
