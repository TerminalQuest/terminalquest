module.exports = helper => {
  if (helper.getNormalizedInput('one') !== 'false') {
    return helper.fail(`
      The answer to the first question is "false" - you should <strong>
      never</strong> run code or commands in your terminal from an untrusted 
      source.
    `);
  }

  if (helper.getNormalizedInput('two').indexOf('true') < 0) {
    return helper.fail(`
      The second answer is "true". Be careful when you use commands dealing with
      files or folders, especially when you delete or move them!
    `);
  }

  helper.success(`
    You got it! The lasers blocking your path vanish in a split second.
  `);
};
