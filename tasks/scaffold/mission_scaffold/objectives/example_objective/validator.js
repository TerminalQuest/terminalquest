module.exports = async helper => {
  try {
    const { answer1, answer2 } = helper.validationFields;
    
    if (!answer1 || answer1.trim() !== 'dogs') {
      return helper.fail(`
        The first answer is incorrect. What array is at index zero of the 
        array in the objective? What is the value at index zero of *that* array?
      `);
    }

    if (!answer2 || answer2.trim() !== 'hockey') {
      return helper.fail(`
        The second answer is incorrect. What array is at index 2 of the 
        array in the objective? What is the value at index 2 of *that* array?
      `);
    }

    helper.success(`
      That did it! You hack the security node, and an index for the 
      <span class="highlight">sixth and final character</span> in the Infinite Loop's 
      master password appears:<br/><br/>
      <span class="highlight">[0][2]</span>
      <br/><br/>
      This is one of six indexes total you will need to discover the password.
    `);
  } catch (e) {
    helper.fail(`
      There was an error processing the password.
    `);
  }
};
