module.exports = {
    // ...
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
    ]
  };