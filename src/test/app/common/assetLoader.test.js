import path from 'path';
import jetpack from 'fs-jetpack';
import {
  readFile,
  readDirectory,
  doesPathExist,
  resolveAbsolutePath,
  requireFromExtension,
  syncBundledAssets,
} from '../../../js/app/common/assetLoader';
import {
  getExternalExtensionDirectories,
  BUNDLED_ASSET_DIRECTORY,
} from '../../../js/app/common/extensions';

import { staticFilePath } from '../../../js/app/common/fs_utils';

jest.mock('../../../js/app/common/context');
jest.mock('../../../js/app/common/fs_utils');
jest.mock('../../../js/app/config/config');

import mockContextFactory from '../../utils/mockContextFactory';
import mockConfigFactory from '../../utils/mockConfigFactory';

const FIXTURES_PATH = path.resolve(__dirname, '..', '..', 'fixtures');
const EXTENSIONS_PATH = path.resolve(FIXTURES_PATH, 'extensions');
const PUBLIC_PATH = path.resolve(FIXTURES_PATH, 'public');

const mockExtensionsContext = mockContextFactory('extensions', {
  enabled: true,
  directory: EXTENSIONS_PATH,
});
const mockConfig = mockConfigFactory({
  bundledExtensionModules: ['twilioquest-base', 'owls-nest-extension'],
});

beforeAll(() => {
  // We need to mock the public file system that our test code is running in
  // to more closely resemble the one in production by using this path to our
  // test fixtures instead.
  staticFilePath.mockImplementation(relativePath => {
    return path.resolve(PUBLIC_PATH, relativePath);
  });
});

const consoleErrorFunction = console.error;

beforeEach(() => {
  // mock console error
  console.error = jest.fn();
});

afterEach(() => {
  // restore mocked console.error
  console.error = consoleErrorFunction;
});

describe('readFile', () => {
  beforeEach(() => {
    mockConfig();
    mockExtensionsContext();
  });
  test('should return undefined if no extension has relative path', async () => {
    const fileContents = await readFile('file/does/not/exist.json');

    expect(fileContents).toBe(undefined);
  });

  test('should return undefined if only invalid extension has file', async () => {
    const fileContents = await readFile('invalid-extension.txt');

    expect(fileContents).toBe(undefined);
  });

  test('should return overridden file from first extension', async () => {
    const fileContents = await readFile('overriddenFile.js');

    expect(fileContents).toBe("console.log('hello from aaa');");
  });

  test('should return file from bundled extension', async () => {
    const fileContents = await readFile('bundled-extension-file.md');

    expect(fileContents).toBe('# Hi from bundled');
  });

  test('should return file from extension overriding bundled extension', async () => {
    const fileContents = await readFile('overridden-bundled-extension-file.md');

    expect(fileContents).toBe('# Hi from bbb');
  });

  test('should return file from first bundled extension', async () => {
    mockConfig({
      bundledExtensionModules: [
        'twilioquest-base',
        'twilioquest-aaa-bundled-two',
      ],
    });

    const fileContents = await readFile('bundled-file.txt');

    expect(fileContents).toBe('twilioquest-aaa-bundled-two');
  });

  test('should allow readFile options to be passed in', async () => {
    const fileContents = await readFile('overriddenFile.js', {});

    // Specifying an empty object of options should replace the default
    // encoding of utf8 and give us a Node.js Buffer.
    expect(fileContents).toBeInstanceOf(Buffer);
  });

  test('should allow extensions to be passed in', async () => {
    const externalExtensions = await getExternalExtensionDirectories();
    const bExtension = externalExtensions.find(
      extension => extension.name === 'bbb-minimal-config-extension'
    );

    const fileContents = await readFile('overriddenFile.js', undefined, [
      bExtension,
    ]);

    expect(fileContents).toBe("console.log('hello from bbb');");
  });
});

describe('readDirectory', () => {
  beforeEach(() => {
    mockConfig();
    mockExtensionsContext();
  });

  test('should combine files from multiple extensions', async () => {
    const files = await readDirectory('tilesets');

    // We do not want to expect an exact array because this function does
    // not guarantee a stable file order.
    expect(files.length).toBe(4);
    expect(files).toEqual(
      expect.arrayContaining([
        'a.png',
        'b.png',
        'tq-base.png',
        'overridden.png',
      ])
    );
  });

  test('should return undefined if directory does not exist', async () => {
    const files = await readDirectory('not/real/directory');

    // We do not want to expect an exact array because this function does
    // not guarantee a stable file order.
    expect(files).toBe(undefined);
  });

  test('should allow extensions to be passed in', async () => {
    const externalExtensions = await getExternalExtensionDirectories();
    const bExtension = externalExtensions.find(
      extension => extension.name === 'bbb-minimal-config-extension'
    );

    const files = await readDirectory('tilesets', [bExtension]);

    // We do not want to expect an exact array because this function does
    // not guarantee a stable file order.
    expect(files.length).toBe(1);
    expect(files).toEqual(expect.arrayContaining(['b.png']));
  });
});

describe('doesPathExist', () => {
  beforeEach(() => {
    mockConfig();
    mockExtensionsContext();
  });

  test('should return true for existing path', async () => {
    const result = await doesPathExist('overriddenFile.js');

    expect(result).toBe(true);
  });

  test('should return false if no path matches', async () => {
    const result = await doesPathExist('not/real/path.js');

    expect(result).toBe(false);
  });
});

describe('resolveAbsolutePath', () => {
  beforeEach(() => {
    mockConfig();
    mockExtensionsContext();
  });

  test('should find first matching path', async () => {
    const absolutePath = await resolveAbsolutePath('overriddenFile.js');

    const expectedPath = path.join(
      EXTENSIONS_PATH,
      'aaa-exhaustive-config-extension',
      'overriddenFile.js'
    );
    expect(absolutePath).toBe(expectedPath);
  });

  test('should return undefined if no path matches', async () => {
    const absolutePath = await resolveAbsolutePath('not/real/path.js');

    expect(absolutePath).toBe(undefined);
  });

  test('should check only passed in extensions', async () => {
    const externalExtensions = await getExternalExtensionDirectories();
    const bExtension = externalExtensions.find(
      extension => extension.name === 'bbb-minimal-config-extension'
    );

    const absolutePath = await resolveAbsolutePath('overriddenFile.js', [
      bExtension,
    ]);

    const expectedPath = path.join(
      EXTENSIONS_PATH,
      'bbb-minimal-config-extension',
      'overriddenFile.js'
    );
    expect(absolutePath).toBe(expectedPath);
  });
});

describe('requireFromExtension', () => {
  test('should throw an exception if no modulePath is provided', async () => {
    expect(async () => {
      const foo = await requireFromExtension();
    }).rejects.toThrow();
  });

  test('should return null if there is no module at the given path', async () => {
    const foo = await requireFromExtension('monkey/rats/donkey/pajamas.js');
    expect(foo).toBe(null);
  });

  test('should return a valid CommonJS module from an extension', async () => {
    const testFoo = await requireFromExtension(
      'objectives/test_mission/test_objective/validator.js'
    );

    expect(testFoo).toBeDefined();
    expect(testFoo('alshd')).toBe(false);
    expect(testFoo('bar')).toBe(true);
  });
});

describe('syncBundledAssets', () => {
  const BUNDLED_PATH = path.join(EXTENSIONS_PATH, BUNDLED_ASSET_DIRECTORY);

  beforeEach(() => {
    mockConfig();
    mockExtensionsContext();
  });

  afterEach(() => {
    // remove .bundled directory
    jetpack.remove(BUNDLED_PATH);
  });

  test('should sync bundled tilesets', async () => {
    await syncBundledAssets();

    const BUNDLED_TILESETS_PATH = path.join(BUNDLED_PATH, 'tilesets');
    const bundledFiles = jetpack.list(BUNDLED_TILESETS_PATH);

    // bundledFiles will be undefined if the directory does not exist
    expect(bundledFiles).toBeDefined();
    expect(bundledFiles.length).toBe(2);
    expect(bundledFiles).toEqual(
      expect.arrayContaining(['tq-base.png', 'overridden.png'])
    );
  });

  test('should sync multiple bundled tilesets', async () => {
    mockConfig({
      bundledExtensionModules: [
        'twilioquest-base',
        'twilioquest-aaa-bundled-two',
      ],
    });

    await syncBundledAssets();

    const BUNDLED_TILESETS_PATH = path.join(BUNDLED_PATH, 'tilesets');
    const bundledFiles = jetpack.list(BUNDLED_TILESETS_PATH);

    const OVERRIDDEN_PATH = path.join(BUNDLED_TILESETS_PATH, 'overridden.png');
    const overriddenFile = jetpack.read(OVERRIDDEN_PATH);

    // bundledFiles will be undefined if the directory does not exist
    expect(bundledFiles).toBeDefined();
    expect(bundledFiles.length).toBe(3);
    expect(bundledFiles).toEqual(
      expect.arrayContaining(['tq-base.png', 'a-bundled.png', 'overridden.png'])
    );
    expect(overriddenFile).toEqual('twilioquest-aaa-bundled-two');
  });

  test('should sync bundled objects', async () => {
    await syncBundledAssets();

    const BUNDLED_TILESETS_PATH = path.join(BUNDLED_PATH, 'objects');
    const bundledFiles = jetpack.list(BUNDLED_TILESETS_PATH);

    // bundledFiles will be undefined if the directory does not exist
    expect(bundledFiles).toBeDefined();
    expect(bundledFiles.length).toBe(3);
    expect(bundledFiles).toEqual(
      expect.arrayContaining(['collider', 'exclamation', 'tile-object'])
    );

    // expect contents of object files to be present as well
    const colliderPath = path.join(
      BUNDLED_TILESETS_PATH,
      'collider',
      'config.js'
    );
    expect(jetpack.exists(colliderPath)).toBe('file');
  });

  test('should sync multiple bundled objects', async () => {
    mockConfig({
      bundledExtensionModules: [
        'twilioquest-base',
        'twilioquest-aaa-bundled-two',
      ],
    });

    await syncBundledAssets();

    const BUNDLED_TILESETS_PATH = path.join(BUNDLED_PATH, 'objects');
    const bundledFiles = jetpack.list(BUNDLED_TILESETS_PATH);

    // bundledFiles will be undefined if the directory does not exist
    expect(bundledFiles).toBeDefined();
    expect(bundledFiles.length).toBe(3);
    expect(bundledFiles).toEqual(
      expect.arrayContaining(['collider', 'exclamation', 'tile-object'])
    );

    // expect contents of object files to be present as well
    const colliderPath = path.join(
      BUNDLED_TILESETS_PATH,
      'collider',
      'config.js'
    );
    expect(jetpack.exists(colliderPath)).toBe('file');

    // collider config should come from overriding extension
    const colliderConfig = require(colliderPath);
    expect(colliderConfig).toBe('twilioquest-aaa-bundled-two-collider-config');
  });

  test('should clear bundled directory before syncing', async () => {
    const filePathToBeRemoved = path.join(BUNDLED_PATH, 'toBeRemoved.txt');

    jetpack.write(
      filePathToBeRemoved,
      'This file should be removed before syncing.'
    );

    await syncBundledAssets();

    expect(jetpack.exists(filePathToBeRemoved)).toBe(false);
  });
});
