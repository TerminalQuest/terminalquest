module.exports = async helper => {
  try {
    const baseUrl = 'https://twilioquest-prod.firebaseapp.com';
    const response = await fetch(`${baseUrl}/quest/tracking/trees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analyticsId: helper.analyticsId,
        createdAt: new Date(),
        missionName: 'ctf',
        objectiveName: 'ctf_plant_tree1',
        playerName: helper.context.settings.name,
      })
    });

    if (response.ok) {
      // 204 indicates success
      helper.success(`
        Thanks for helping plant a tree in Australia!
      `);
    } else {
      if (response.status === 403) {
        return helper.success(`
          You've already planted this tree - good for you!
        `);
      } else {
        return helper.fail(`
          Sorry, something went wrong submitting your request. Try again later!
        `);
      }
    }
  } catch (err) {
    console.log(err);
    helper.fail(
      `Something went wrong when we tried to plant a tree on your behalf:
      <br/></br/>
      ${err}`
    );
  }
};
