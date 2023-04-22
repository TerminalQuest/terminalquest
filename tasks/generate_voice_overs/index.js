const path = require('path');
const parseOptions = require('./parse_options');
const writeSpeechFilesForConversation = require('./write_files');
const buildFileList = require('./build_file_list');
const getStatementsFromConversationFile = require('./read_conversation_files');

const options = parseOptions();

console.log(options);

const { missions, fileFilter } = options;

const conversationFilePaths = buildFileList(missions, fileFilter);

console.log(
  'Creating voice overs for the following files (if they have statements):'
);
console.log(conversationFilePaths);

conversationFilePaths.forEach(filePath => {
  const statements = getStatementsFromConversationFile(filePath);

  writeSpeechFilesForConversation(
    statements,
    path.dirname(filePath),
    path.basename(filePath)
  );
});
