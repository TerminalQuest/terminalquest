import path from 'path';
import { promises as fs } from 'fs';
import isDev from 'electron-is-dev';
import * as jetpack from 'fs-jetpack';
import { removeDuplicates } from './utils';
import {
  getAllValidExtensions,
  getBundledExtensionDirectories,
  areExtensionsReady,
  getExtensionDirectory,
  BUNDLED_ASSET_DIRECTORY,
  BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY,
} from './extensions';

/**
 * Read a file based on a path relative to extensions' root directory.
 *
 * This means, files that can be overwritten by extensions will be looked
 * up and read from the appropriate extension with this function.
 *
 * WARNING:
 * If an underlying error occurs in the readFile call, the details will be
 * logged to the console, and this function will return undefined.
 *
 * @param {string} relativePath - path relative to the extension root directory
 * @param {object} readFileOptions - any custom options to set on the fs.readFile call. This defaults to utf8 encoding.
 * @param {Extension[]} extensions - list of extensions to read the directory from. This defaults to all ready extensions.
 * @returns {string | undefined} will return the contents of the read file or return undefined if the file doesn't exist
 */
async function readFile(
  relativePath,
  options = { encoding: 'utf8' },
  extensions
) {
  const absolutePath = await resolveAbsolutePath(relativePath, extensions);

  if (!absolutePath) {
    // file does not exist in any extension
    return undefined;
  }

  try {
    const file = await fs.readFile(absolutePath, options);

    return file;
  } catch (err) {
    // there was an error trying to read the asset
    console.error(err);
  }

  return undefined;
}

/**
 * Check if an absolute path exists on the filesystem
 *
 * @param {string} absolutePath
 * @returns {boolean}
 */
async function doesAbsolutePathExist(absolutePath) {
  try {
    if (await fs.stat(absolutePath)) {
      return true;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // fs.stat throws an error if the file does not exist.
      // log any other error that occurs
      console.error(err);
    }
  }

  return false;
}

/**
 * Read a directory based on a path relative to extensions' root directory.
 * This function will read the appropriate directory in every extension
 * passed into the second parameter and then merge those results.
 *
 * When the second parameter of this function is omitted, this function will
 * look up all valid extensions as defined by {@link getAllValidExtensions}.
 *
 * WARNING:
 * If an underlying error occurs in the readdir calls, the details will be
 * logged to the console, and this function will return undefined.
 *
 * @param {string} relativePath - path relative to the extension root directory
 * @param {Extension[]} extensions - list of extensions to read the directory from
 * @returns {string[] | undefined} will return the result of the readdir call or return undefined if the directory doesn't exist
 */
async function readDirectory(relativePath, extensions) {
  if (extensions === undefined) {
    // use all directories
    extensions = await getAllValidExtensions();
  }

  const readdirPromises = extensions.map(async extension => {
    const absolutePath = path.join(extension.absolutePath, relativePath);

    if (await doesAbsolutePathExist(absolutePath)) {
      const directory = await fs.readdir(absolutePath);

      return directory;
    }

    return undefined;
  });
  const results = await Promise.all(readdirPromises);
  const filteredResults = results.filter(result => result !== undefined);

  if (filteredResults.length === 0) {
    // This directory does not exist in any extension
    return undefined;
  }

  const flattenedResults = filteredResults.flat();

  return removeDuplicates(flattenedResults);
}

/**
 * Determines if a file path relative to extensions' root directory exists.
 *
 * This means, directories that can be overwritten by extensions will be looked
 * up and read from the appropriate extension with this function.
 *
 * WARNING:
 * If an underlying error occurs in the readdir call, the details will be
 * logged to the console, and this function will return false.
 *
 * @param {string} relativePath - path relative to the extension root directory
 * @returns {boolean} will return true if the path exists and false otherwise
 */
async function doesPathExist(relativePath) {
  return Boolean(await resolveAbsolutePath(relativePath));
}

/**
 * Evaluates the absolute system path of a given path relative to an extensions'
 * root directory.
 *
 * This function checks all available extensions and default content for the
 * file path.
 *
 * @param {string} relativePath - path relative to the extension root directory
 * @param {Extension[]} extensions - list of extensions to read the directory from
 * @returns {string} absolute file path
 */
async function resolveAbsolutePath(relativePath, extensions) {
  if (extensions === undefined) {
    // use all directories
    extensions = await getAllValidExtensions();
  }

  for (let extension of extensions) {
    const absoluteFilePath = path.join(extension.absolutePath, relativePath);

    if (await doesAbsolutePathExist(absoluteFilePath)) {
      return absoluteFilePath;
    }
  }

  return undefined;
}

async function copyDirectory(source, destination, extensions) {
  if (extensions === undefined) {
    // use all directories
    extensions = await getAllValidExtensions();
  }

  const sourceDirectory = await readDirectory(source, extensions);

  const copyPromises = sourceDirectory.map(async sourceFile => {
    const relativePath = path.join(source, sourceFile);
    const sourcePath = await resolveAbsolutePath(relativePath, extensions);
    const destinationPath = path.join(destination, sourceFile);

    await jetpack.copyAsync(sourcePath, destinationPath, { overwrite: true });
  });

  await Promise.all(copyPromises);
}

/**
 * When extensions are ready, this function will sync all bundled
 * extension assets with the user specified extensions folder.
 */
async function syncBundledAssets() {
  if (!areExtensionsReady()) {
    // We have nothing to sync if extensions aren't ready
    return;
  }

  const extensionsDirectory = getExtensionDirectory();
  const bundledExtensions = await getBundledExtensionDirectories();

  const destinationRoot = path.join(
    extensionsDirectory,
    BUNDLED_ASSET_DIRECTORY
  );

  // Clear the existing bundled extensions to ensure we're
  // operating on the latest versions.
  await jetpack.removeAsync(destinationRoot);

  const tilesetsDestination = path.join(destinationRoot, 'tilesets');
  await copyDirectory('tilesets', tilesetsDestination, bundledExtensions);

  const objectsDestination = path.join(destinationRoot, 'objects');
  await copyDirectory('objects', objectsDestination, bundledExtensions);
}

/**
 * Asynchronously require a module from an extension folder.
 *
 * @param {string} modulePath - assetLoader path for a JavaScript module
 * @returns {any} module - the CommonJS module exported by the script
 *                         at the given path
 */
async function requireFromExtension(modulePath) {
  if (!modulePath) {
    throw new Error('modulePath is required.');
  }

  // Return null if there's no module at the given path
  const absoluteModulePath = await resolveAbsolutePath(modulePath);
  if (!absoluteModulePath) {
    return null;
  }

  if (isDev || window.reloadExternalModules) {
    // In development, constantly reload external modules, since with
    // validators and event code, we want to reload the latest regularly
    delete require.cache[require.resolve(absoluteModulePath)];
  }

  // Go ahead and require the module, then resolve the promise
  return require(absoluteModulePath);
}

function isPathFromBundledExtension(absolutePath) {
  return absolutePath.includes(BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY);
}

async function getOwningExtensionName(absolutePath) {
  let pathRelativeToExtensionsDirectory;

  if (isPathFromBundledExtension(absolutePath)) {
    // this is a bundled extension path
    [, pathRelativeToExtensionsDirectory] = absolutePath.split(
      BUNDLED_EXTENSION_DISTRIBUTION_DIRECTORY
    );
  }

  const extensionsDirectory = await getExtensionDirectory();

  if (absolutePath.includes(extensionsDirectory)) {
    // this is an extension in the extensions directory

    [, pathRelativeToExtensionsDirectory] = absolutePath.split(
      extensionsDirectory
    );
  }

  if (!pathRelativeToExtensionsDirectory) {
    // This path is not owned by any extension
    return false;
  }

  const [, extensionName] = pathRelativeToExtensionsDirectory.split(path.sep);

  return extensionName;
}

async function getPathRelativeToOwningExtension(absolutePath) {
  const extensionName = await getOwningExtensionName(absolutePath);

  if (!extensionName) {
    // This absolute path is not owned by any extension
    return false;
  }

  const [, relativePath] = absolutePath.split(extensionName);

  return relativePath;
}

export {
  readFile,
  readDirectory,
  doesPathExist,
  resolveAbsolutePath,
  requireFromExtension,
  syncBundledAssets,
  getOwningExtensionName,
  getPathRelativeToOwningExtension,
  isPathFromBundledExtension,
};
