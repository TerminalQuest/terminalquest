const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const itemsDir = path.join(rootDir, 'public', 'items');
const levelsDir = path.join(rootDir, 'public', 'levels');

const isDirectory = source => fs.lstatSync(source).isDirectory();
const getDirectories = source =>
  fs
    .readdirSync(source)
    .map(name => path.join(source, name))
    .filter(isDirectory);

const allItems = new Set(
  getDirectories(itemsDir).map(dir => path.basename(dir))
);
const rewardsByItem = {};

// Walk public/levels
getDirectories(levelsDir).forEach(levelDir => {
  try {
    getDirectories(path.join(levelDir, 'objectives')).forEach(objDir => {
      const objective = require(path.join(objDir, 'objective.json'));
      if (objective.rewards && objective.rewards.items) {
        objective.rewards.items.forEach(item => {
          const existing = rewardsByItem[item] || [];
          existing.push(
            path.join(objDir, 'objectives.json').replace(rootDir + '/', '')
          );
          rewardsByItem[item] = existing;
        });
      }
    });
  } catch (err) {
    // pass
  }
});

function reportCollisions() {
  for (const [itemName, files] of Object.entries(rewardsByItem)) {
    if (files.length > 1) {
      console.log(`${itemName} occurs ${files.length} times:`);
      files.forEach(f => console.log(f));
      console.log('');
    }
  }
}

function reportAvailableItems() {
  const rewarded = new Set(Object.keys(rewardsByItem));
  // Set difference :( allItems - rewarded
  const difference = [...allItems].filter(x => !rewarded.has(x));
  console.log(difference.join(', '));
}

console.log('Duplicated items:');
reportCollisions();
console.log('Available items:');
reportAvailableItems();
