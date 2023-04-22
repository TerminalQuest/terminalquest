const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { ncp } = require('ncp');
const { stripIndents } = require('common-tags');
const commandLineArgs = require('command-line-args');

/**
 * Define command line arguments this function takes.
 *
 * If this is executed as an npm script, arguments
 * to this script must be passed preceeded with `--`.
 * For more info: https://docs.npmjs.com/cli/run-script
 *
 * Example:
 * npm run scaffold:mission -- javascript
 */
const optionDefinitions = [
  { name: 'missionName', type: String, defaultOption: true },
];

/**
 * npm-run-script sets this env var
 * https://docs.npmjs.com/cli/run-script
 */
const projectRootDir = process.env.INIT_CWD;

async function run() {
  const options = commandLineArgs(optionDefinitions);

  if (!options.missionName) {
    console.error(
      stripIndents(chalk`{red {bold No mission was provided!} This command requires a mission name.}
    
    {blue Example:} "npm run scaffold:mission -- javascript"`)
    );
    return;
  }

  const levelsDirPath = path.resolve(projectRootDir, 'public', 'levels');
  const levelNames = await getAllDirNames(levelsDirPath);

  if (levelNames.includes(options.missionName)) {
    console.error(
      stripIndents(chalk`{red {bold This mission already exists!}}
      
      "${options.missionName}" already exists.`)
    );
    return;
  }

  const newMissionPath = path.resolve(levelsDirPath, options.missionName);
  await copyMissionDirectory(newMissionPath);

  console.log(
    chalk`{green Done creating {bold ${options.missionName}} directory!}`
  );
}

run();

async function getAllDirNames(path) {
  const dirContents = await fs.readdir(path, { withFileTypes: true });
  const dirNames = dirContents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  return dirNames;
}

async function copyMissionDirectory(targetPath) {
  const missionScaffoldDir = path.resolve(
    projectRootDir,
    'tasks',
    'scaffold',
    'mission_scaffold'
  );

  return new Promise((resolve, reject) => {
    ncp(missionScaffoldDir, targetPath, err => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}
