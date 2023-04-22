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
  } catch (e) {
    console.log(e);
    return helper.fail(`
      There was a problem validating your input - please try again.
    `);
  }

  helper.success(`
    That looks right! The value you entered is a valid folder path on your
    computer.

    The barrier ahead of you dissipates, and you can proceed further into the
    simulation.
  `);
};
