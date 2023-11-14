var os = require('os');
const path = require('path')
const fs = require('node:fs/promises');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'TerminalQuest',
        description: 'The TerminalQuest game client',
        iconUrl: 'https://github.com/TerminalQuest/terminalquest/blob/main/public/images/app/logo.png'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        description: 'The TerminalQuest game client',
        name: 'TerminalQuest',
        homepage:'https://terminal.quest/'
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        description: 'The TerminalQuest game client',
        name: 'TerminalQuest',
        homepage:'https://terminal.quest/'
      },
    },
    {
        name: '@electron-forge/maker-dmg',
        config: {
          icon: 'public/images/app/logo.png',
          iconSize: 42,
          name: 'TerminalQuest'.concat("-",os.platform, os.arch),
          format: 'ULFO'
        }
      },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Xlient',
          name: 'terminalquest'
        },
        prerelease: true,
        draft: false
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
  hooks: { // workaround for dangling symlink issue : https://github.com/nodejs/node-gyp/issues/2713
    packageAfterPrune: async (_config, buildPath) => {
      const gypPath = path.join(
        buildPath,
        'node_modules',
        'node-sass',
        'build',
        'node_gyp_bins'
      );
      await fs.rm(gypPath, {recursive: true, force: true});
   }
 }
};
