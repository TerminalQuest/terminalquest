const jetpack = require('fs-jetpack');
const path = require('path');

const flatSingle = arr => [].concat(...arr);

function buildFileList(missions, fileFilter) {
  return flatSingle(
    missions.map(mission => readConversationFiles(mission, fileFilter))
  );
}

function readConversationFiles(missionName, fileFilter) {
  const conversationDirPath = `./public/levels/${missionName}/conversations`;

  if (!doesDirExist(conversationDirPath)) {
    console.warn(
      `Conversations directory doesn't exist for: ${missionName}! Not generating any voice overs for this level.`
    );
    return;
  }

  const conversationFiles = jetpack.list(conversationDirPath);

  return conversationFiles
    .map(conversationFileName =>
      convertConversationsDirToFileList(
        conversationDirPath,
        conversationFileName,
        fileFilter
      )
    )
    .filter(file => file !== undefined);
}

function convertConversationsDirToFileList(
  conversationDirPath,
  conversationFileName,
  fileFilter
) {
  const filePath = `${conversationDirPath}/${conversationFileName}`;

  if (jetpack.exists(filePath) === 'dir') {
    // Ignore directories
    return;
  }

  if (!fileFilter.test(conversationFileName)) {
    // This file doesn't pass our filter test
    return;
  }

  const fileExtension = path.extname(conversationFileName);
  if (fileExtension !== `.pug`) {
    // We only support pug files!
    return;
  }

  return filePath;
}

function doesDirExist(pathName) {
  return jetpack.exists(pathName) === 'dir';
}

module.exports = buildFileList;
