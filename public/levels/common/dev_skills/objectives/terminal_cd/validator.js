const path = require('path');
const jetpack = require('fs-jetpack');

module.exports = async helper => {
  const { pwdOutput } = helper.validationFields;

  if (!pwdOutput) {
    return helper.fail(`
      Please provide the output of the <strong>pwd</strong> command!
    `);
  }

  try {
    const exists = await jetpack.existsAsync(pwdOutput);
    if (!exists) {
      return helper.fail(`
        Hmm, it looks like the value you entered is not a valid path
        to a folder on your computer. Make sure you copy and paste in **only**
        the output from the <strong>pwd</strong> command, and none of the other
        text!
      `);
    }

    if (path.basename(pwdOutput) !== 'quest') {
      return helper.fail(`
        It looks like you didn't name this folder <strong>quest</strong> as
        directed in the objective. Make sure you followed the instructions
        precisely. If you need to rename your folder, check out the instructions
        in the "Help" tab.
      `);
    }
  } catch (e) {
    console.log(e);
    return helper.fail(`
      There was a problem validating your input - please try again.
    `);
  }

  helper.success(`
    Way to go! You created a new folder on your computer from the CLI.
  `);
};
