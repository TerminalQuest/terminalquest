import path from 'path';
import { 
  areExtensionsEnabled,
  areExtensionsReady,
  getAllValidExtensions, 
  getBundledExtensionDirectories, 
  getExtensionDirectory,
  getExternalExtensionDirectories,
  BUNDLED_ASSET_DIRECTORY
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
  directory: EXTENSIONS_PATH
});

const mockConfig = mockConfigFactory({ 
  bundledExtensionModules: ['twilioquest-base', 'owls-nest-extension'] 
});

beforeAll(() => {
  // We need to mock the public file system that our test code is running in
  // to more closely resemble the one in production by using this path to our
  // test fixtures instead.
  staticFilePath.mockImplementation((relativePath) => {
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
})

describe('getAllValidExtensions', () => {
  test('should return valid external and bundled extensions when extensions are ready', async () => {
    mockConfig({
      bundledExtensionModules: [
        'twilioquest-base',
        'twilioquest-aaa-bundled-extension'
      ]
    });
    mockExtensionsContext();

    const allValidExtensions = await getAllValidExtensions();
    const validBundledExtensions = (await getBundledExtensionDirectories())
      .filter(extension => extension.isValid);
    const validExternalExtensions = (await getExternalExtensionDirectories())
      .filter(extension => extension.isValid);

    expect(allValidExtensions.length).toBe(
      validBundledExtensions.length + validExternalExtensions.length
    );
    // all bundled extensions should be present
    validBundledExtensions.forEach(bundled => {
      expect(allValidExtensions).toContainEqual(bundled);
    });
    // all external extensions should be present
    validExternalExtensions.forEach(external => {
      expect(allValidExtensions).toContainEqual(external);
    });

    // expect extensions are in correct order
    expect(allValidExtensions).toEqual(
      [
        expect.objectContaining({
          name: 'aaa-exhaustive-config-extension'
        }),
        expect.objectContaining({
          name: 'bbb-minimal-config-extension'
        }),
        expect.objectContaining({
          name: 'twilioquest-aaa-bundled-extension'
        }),
        expect.objectContaining({
          name: 'twilioquest-base'
        })
      ]
    )
  });

  test('should return only valid extensions if extensions are not ready', async () => {
    mockConfig({ bundledExtensionModules: ['twilioquest-base'] });
    // We're making an assumption here that enabled false will
    // mean extensions are not ready
    mockExtensionsContext({ enabled: false });

    const allValidExtensions = await getAllValidExtensions();
    const validBundledExtensions = (await getBundledExtensionDirectories())
      .filter(extension => extension.isValid);   

    expect(allValidExtensions.length).toBe(
      validBundledExtensions.length
    );
    // all bundled extensions should be present
    validBundledExtensions.forEach(bundled => {
      expect(allValidExtensions).toContainEqual(bundled);
    });
  });
});

describe('getExternalExtensionDirectories', () => {
  test('should return an empty array if no extension directory is set', async () => {
    mockExtensionsContext({ directory: null });

    const externalExtensions = await getExternalExtensionDirectories();

    expect(externalExtensions.length).toBe(0);
  });

  test('should return empty array if extension directory does not exist', async () => {
    mockExtensionsContext({ directory: 'not/real/directory' });

    const externalExtensions = await getExternalExtensionDirectories();

    expect(externalExtensions.length).toBe(0);
  });

  test('should return appropriate valid and invalid extensions', async () => {
    mockExtensionsContext();

    const externalExtensions = await getExternalExtensionDirectories();

    // We should have logged one ValidationError as we parsed
    // the invalid extension
    expect(console.error).toHaveBeenCalledTimes(1);
    const error = console.error.mock.calls[0][0];
    expect(error.name).toBe('ValidationError');
    
    // Parsed external extensions array should be appropriate length
    expect(externalExtensions.length).toBe(3);

    // This test is checking a lot of various things based on the
    // architecture of the extensions fixture.

    // We expect extensions to be sorted in ascii order
    const names = externalExtensions.map(({ name }) => name);
    const [name1, name2, name3] = names;
    expect(name1 < name2).toBe(true);
    expect(name2 < name3).toBe(true);

    // Bundled extensions hidden directory should be ignored
    expect(names.includes(BUNDLED_ASSET_DIRECTORY)).toBe(false);

    // Files in extensions directory should be ignored
    expect(names.includes('files-are-not-extensions.json')).toBe(false);

    // We expect absolutePaths to be correct
    // We expect invalid/valid extensions to be marked
    //  - Extension with all package fields should be valid
    //  - Extension with only required package fields should be valid
    //  - Extension missing required package fields should be invalid
    expect(externalExtensions[0]).toEqual({
      name: 'aaa-exhaustive-config-extension',
      absolutePath: path.join(EXTENSIONS_PATH, 'aaa-exhaustive-config-extension'),
      isValid: true
    });
    expect(externalExtensions[1]).toEqual({
      name: 'bbb-minimal-config-extension',
      absolutePath: path.join(EXTENSIONS_PATH, 'bbb-minimal-config-extension'),
      isValid: true
    });
    expect(externalExtensions[2]).toEqual({
      name: 'ccc-invalid-extension',
      absolutePath: path.join(EXTENSIONS_PATH, 'ccc-invalid-extension'),
      isValid: false
    });
  });
});

describe('getBundledExtensionDirectories', () => {
  test('should return extension information about bundled extensions when they\'re listed in config', () => {
    mockConfig({ bundledExtensionModules: ['twilioquest-base'] });

    const bundledExtensions = getBundledExtensionDirectories();

    expect(bundledExtensions.length).toBe(1);
    expect(bundledExtensions[0].absolutePath).toBe(path.join(PUBLIC_PATH, 'node_modules', 'twilioquest-base'));
    expect(bundledExtensions[0].name).toBe('twilioquest-base');
    expect(bundledExtensions[0].isValid).toBe(true);
  });

  test('should return no bundled extensions if config does NOT list any', () => {
    mockConfig({ bundledExtensionModules: [] });

    const bundledExtensions = getBundledExtensionDirectories();
    
    expect(bundledExtensions.length).toBe(0);
  });
});

describe('areExtensionsEnabled', () => {
  test('should return enabled from context', () => {
    mockExtensionsContext({ enabled: true });

    expect(areExtensionsEnabled()).toBe(true);
  })
});

describe('getExtensionsDirectory', () => {
  test('should return directory from context', () => {
    mockExtensionsContext({ directory: EXTENSIONS_PATH });

    expect(getExtensionDirectory()).toBe(EXTENSIONS_PATH);
  })
});

describe('areExtensionsReady', () => {
  test('should return true if extensions are enabled and extensions directory is set', () => {
    mockExtensionsContext();

    expect(areExtensionsReady()).toBe(true);
  });

  test('should return false if extensions are DISABLED and extensions directory is set', () => {
    mockExtensionsContext({ enabled: false });

    expect(areExtensionsReady()).toBe(false);
  });

  test('should return false if extensions are enabled and extensions directory is NOT set', () => {
    mockExtensionsContext({ directory: null });

    expect(areExtensionsReady()).toBe(false);
  });

  test('should return false if extensions are DISABLED and extensions directory is NOT set', () => {
    mockExtensionsContext({ enabled: false, directory: null });

    expect(areExtensionsReady()).toBe(false);
  });
});
