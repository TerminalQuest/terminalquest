const commandLineArgs = require('command-line-args');
const jetpack = require('fs-jetpack');
const { isDir } = require('./helpers');
const {
  DEFAULT_BLACK_LIST,
  MISSION_DIR,
  DEFAULT_FILE_FILTER,
} = require('./consts');

function parse() {
  const optionDefinitions = [
    {
      name: 'src',
      type: String,
      multiple: true,
      defaultOption: true,
      defaultValue: [],
    },
    { name: 'all', alias: 'A', type: Boolean },
    {
      name: 'filter',
      alias: 'f',
      type: String,
      defaultValue: DEFAULT_FILE_FILTER,
    },
  ];

  let options;

  try {
    options = commandLineArgs(optionDefinitions);
  } catch (err) {
    console.warn(
      'Those are invalid CLI arguments!\n\nError Message: ',
      err.message
    );
    process.exit();
  }

  return {
    fileFilter: new RegExp(options.filter, 'i'),
    missions: getMissions(options),
  };
}

function getMissions(options) {
  let missions = [];

  if (options.src.length === 0 && !options.all) {
    console.warn(
      `Must set --all/-A flag to run on all conversations without specifying source files.`
    );
    process.exit();
  }

  if (options.src.length > 0 && options.all) {
    console.warn(`Cannot use --all/-A flag and source directories together.`);
    process.exit();
  }

  if (options.src.length === 0 && options.all) {
    missions = getAllMissionNames(buildBlackList(options));
  }

  if (options.src.length > 0) {
    options.src.forEach(src => {
      if (isDir(src)) {
        missions.push(src);
      } else {
        console.warn(
          `Can only operate on directories for now. Invalid source: ${src}`
        );
        process.exit();
      }
    });
  }

  return missions;
}

function buildBlackList(options) {
  return DEFAULT_BLACK_LIST;
}

function getAllMissionNames(blackList) {
  const isIgnoredMission = file => blackList.includes(file);

  return jetpack
    .list(MISSION_DIR)
    .map(mission => (isDir(mission) ? mission : null))
    .filter(mission => mission !== null && !isIgnoredMission(mission));
}

module.exports = parse;
