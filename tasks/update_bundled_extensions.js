const path = require('path');
const util = require('util');
const { getBundledExtensionNames } = require('./utils/bundledExtensions');
const exec = util.promisify(require('child_process').exec);

/**
 * This script does not have robust handling for npm install
 * failures.
 *
 * It is likely it should be shored up if intended to run in
 * CI and not locally with developer supervision.
 */
async function run() {
  const bundledExtensionModules = getBundledExtensionNames();

  const publicPath = path.join(__dirname, '..', 'public');

  const installPromises = bundledExtensionModules.map(bundledExtension => {
    console.log(
      `Installing bundled extension: "${bundledExtension}" at latest`
    );
    return exec(`npm install ${bundledExtension}@latest`, { cwd: publicPath });
  });

  await Promise.all(installPromises);

  console.log('All bundled modules installed.');
}

run();
