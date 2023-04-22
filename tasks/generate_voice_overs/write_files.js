const aws = require('aws-sdk');
const jetpack = require('fs-jetpack');
const { getBaseName } = require('./helpers');

// Create single AWS Polly instance
const polly = new aws.Polly({
  signatureVersion: 'v4',
  region: 'us-east-1',
});

function writeSpeechFilesForConversation(
  statements,
  conversationDirPath,
  conversationFileName
) {
  const voiceOverDirPath = `${conversationDirPath}/vo`;

  jetpack.dir(voiceOverDirPath);

  const baseName = getBaseName(conversationFileName);

  statements.forEach(({ id, text, speech }) => {
    const pollyParams = {
      OutputFormat: 'mp3',
      VoiceId: 'Brian',
      LanguageCode: 'en-GB',
      Text: speech ? `<speak>${speech}</speak>` : text,
      TextType: speech ? 'ssml' : 'text',
    };

    polly.synthesizeSpeech(pollyParams, (err, data) => {
      if (err) {
        console.log(err.code);
      } else if (data) {
        if (data.AudioStream instanceof Buffer) {
          jetpack.write(
            `${voiceOverDirPath}/${baseName}_${id}.mp3`,
            data.AudioStream
          );
        }
      }
    });
  });
}

module.exports = writeSpeechFilesForConversation;
