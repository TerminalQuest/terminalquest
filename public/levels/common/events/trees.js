/**
 * On levelDidLoad, toggle visibility of any appropriate trees.
 * 
 * @param {object} world game world object
 * @param {object} event game world event
 */
exports.toggleTrees = (world) => {
  const earthdayTrees = world.getState('earthdayTrees') || {};
  // Seems to be a minor timing issue where sometimes this doesn't happen after
  // a map transition unless there is a small delay.
  setTimeout(() => {
    Object.keys(earthdayTrees).forEach(key => {
      world.showEntities(key);
    });
  }, 10);
}

/**
 * Handle an interaction event with an earth day promotion tree.
 * 
 * @param {object} event game world event
 * @param {object} world game world object
 */
exports.handleTreeInteraction = async (event, world) => {
  if (
    !event.name === 'playerDidInteract' || 
    !event.target || 
    !event.target.earthdayTree
  ) {
    return;
  }

  const earthdayTrees = world.getState('earthdayTrees') || {};
  const treeKey = event.target.key;

  if (!earthdayTrees[treeKey]) {
    earthdayTrees[treeKey] = true;
    world.showEntities(treeKey);
    const treesFound = Object.keys(earthdayTrees).length;
    const updateText = `
      <br/><br/><i>
        You have found <em>${treesFound} of 12 trees</em> in the 
        <a href="https://www.twilio.com/quest/earthday" style="color:white;">
        2021 Earth Day Challenge</a>.
      </i>
    `;
    world.showNotification(`
      You interact with the terraforming controls, and in a moment, a tree
      springs to life. Oh, the wonders of science!
      ${updateText}
    `);

    // Send tree count progress to 
    try {
      const baseUrl = 'https://twilioquest-prod.firebaseapp.com';
      const response = await fetch(`${baseUrl}/quest/tracking/trees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analyticsId: world.getContext('user').guid,
          createdAt: new Date(),
          missionName: 'earthday2021',
          objectiveName: treeKey,
          playerName: world.getContext('settings').name,
        })
      });
      console.log(response);
    } catch(e) {
      console.log('Tree progress not saved to server.');
      console.error(e);
    }
  } else {
    const treesFound = Object.keys(earthdayTrees).length;
    const updateText = `
      <br/><br/><i>
        You have found <em>${treesFound} of 12 trees</em> in the 
        <a href="https://www.twilio.com/quest/earthday" style="color:white;">
        2021 Earth Day Challenge</a>.
      </i>
    `;
    world.showNotification(`
        The tree's lifesign readings appear to be strong - that's a relief!
        It's hard to keep plants healthy and growing in a virtual environment.
      ${updateText}
    `);
  }

  world.setState('earthdayTrees', earthdayTrees);
};
