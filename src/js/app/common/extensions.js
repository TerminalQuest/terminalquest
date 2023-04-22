import path from 'path';
import jetpack from 'fs-jetpack';
import * as yup from 'yup';
import { staticFilePath } from './fs_utils';
import { getContext } from './context';
import config from '../config/config';
import { omitKey } from './utils';

const BUNDLED_ASSET_DIRECTORY = '.bundled';
const BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY = 'node_modules';

/**
 * @typedef {Object} Extension
 * @property {absolutePath} - absolute file path to the root directory of this extension
 * @property {name} - identifier of this extension
 * @property {isValid} - is this extension in a valid format
 */

/**
 * Get all valid extension directories.
 *
 * @returns {Extension[]}
 */
async function getAllValidExtensions() {
  let externalDirectories = [];

  if (areExtensionsReady()) {
    externalDirectories = await getExternalExtensionDirectories();
  }

  const bundledDirectories = getBundledExtensionDirectories();

  return [...externalDirectories, ...bundledDirectories].filter(
    extension => extension.isValid
  );
}

/**
 * Reads a given directory and returns an array of parsed {@link Extension}s.
 *
 * @param {string} directoryPath - path to a directory containing extensions
 * @returns {Extension[]}
 */
async function parseExtensionsDirectory(directoryPath) {
  const potentialExtensions = await jetpack.listAsync(directoryPath);

  if (!potentialExtensions) {
    // directory path was invalid
    return [];
  }

  const extensionValidationPromises = potentialExtensions.map(
    async potentialExtension => {
      const absolutePath = path.join(directoryPath, potentialExtension);

      return {
        isValid: await isExtensionValid(absolutePath),
        isDir: (await jetpack.existsAsync(absolutePath)) === 'dir',
        absolutePath,
        name: potentialExtension,
      };
    }
  );
  const extensions = (await Promise.all(extensionValidationPromises))
    // Non-directories are not passed along as invalid extensions.
    // This prevents us from seeing files like .DS_Store.
    .filter(extension => extension.isDir)
    .filter(extension => extension.name !== BUNDLED_ASSET_DIRECTORY)
    .map(omitKey('isDir'));

  // Intentionally mutate extensions array with .sort
  extensions.sort((a, b) => a.name.localeCompare(b.name));

  return extensions;
}

/**
 * Get the {@link Extension}s for external extensions.
 *
 * @returns {Extension[]} - extension directory file path
 */
async function getExternalExtensionDirectories() {
  const extensionDirectoryPath = getExtensionDirectory();

  if (!extensionDirectoryPath) {
    return [];
  }

  return await parseExtensionsDirectory(extensionDirectoryPath);
}

/**
 * Get the {@link Extension}s for extensions bundled with TerminalQuest.
 *
 * @returns {Extension[]} - extension directory file path
 */
function getBundledExtensionDirectories() {
  const pathToNodeModules = staticFilePath(
    BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY
  );

  const extensions = config.bundledExtensionModules.map(module => {
    const absolutePath = path.join(pathToNodeModules, module);

    return {
      absolutePath,
      name: module,
      isValid: true,
    };
  });

  // Intentionally mutate extensions array with .sort
  extensions.sort((a, b) => a.name.localeCompare(b.name));

  return extensions;
}

/**
 * Checks if the user has enabled external extensions.
 *
 * @returns {boolean}
 */
function areExtensionsEnabled() {
  const { enabled } = getContext('extensions');

  return enabled;
}

/**
 * Determines if the extension at the provided path is a valid one.
 *
 * @param {String} extensionPath - absolute path to a
 * @returns {boolean}
 */
async function isExtensionValid(extensionPath) {
  if ((await jetpack.existsAsync(extensionPath)) !== 'dir') {
    // extensions must be a directory
    return false;
  }

  const configPath = path.join(extensionPath, 'package.json');

  try {
    const configString = await jetpack.readAsync(configPath);

    if (configString === undefined) {
      // package.json does not exist!
      return false;
    }

    const config = JSON.parse(configString);

    const configSchema = yup.object().shape({
      name: yup.string().required(),
      description: yup.string(),
      version: yup.string().required(),
      engines: yup.object().shape({
        twilioquest: yup.string(),
      }),
    });

    /**
     * This function throws Validation errors if the format of the provided
     * input does not match the schema.
     */

    configSchema.validateSync(config);
  } catch (err) {
    console.error(err);
    return false;
  }

  return true;
}

/**
 * Get the path to the public extensions directory.
 *
 * @returns {string}
 */
function getExtensionDirectory() {
  const { directory } = getContext('extensions');

  return directory;
}

/**
 * Checks if external extensions can be used.
 *
 * @returns {boolean}
 */
function areExtensionsReady() {
  return areExtensionsEnabled() && getExtensionDirectory() !== null;
}

export {
  getAllValidExtensions,
  getBundledExtensionDirectories,
  getExternalExtensionDirectories,
  getExtensionDirectory,
  areExtensionsReady,
  areExtensionsEnabled,
  BUNDLED_ASSET_DIRECTORY,
  BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY,
};
