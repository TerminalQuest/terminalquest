var os = require('os');
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
        description: 'TerminalQuest',
        iconUrl: 'https://github.com/TerminalQuest/terminalquest/blob/main/public/images/app/logo.png'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
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
        prerelease: true
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
