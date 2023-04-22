const { 
  toggleTrees, 
  handleTreeInteraction 
} = require('../common/events/trees');

module.exports = function(event, world) {
  // Toggle tree visibility
  if (event.name === 'levelDidLoad') {
    toggleTrees(world);
  }

  // Possibly handle a tree interaction
  handleTreeInteraction(event, world);
};
