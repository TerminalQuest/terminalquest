const klaw = require('klaw');
const path = require('path');
const fs = require('fs').promises;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const levelsDir = path.resolve('public', 'levels');
const items = [];

function isFileObjectiveJson(filePath) {
  if (path.basename(filePath) !== 'objective.json') {
    return false;
  }

  return true;
}

const csvWriter = createCsvWriter({
  path: 'objectives.csv',
  header: [{
      id: 'level',
      title: 'Level Name'
    },
    {
      id: 'objective',
      title: 'Objective Title'
    },
    {
      id: 'difficulty',
      title: 'Difficulty'
    },
    {
      id: 'xp',
      title: 'XP'
    },
    {
      id: 'ide',
      title: 'IDE'
    },
    {
      id: 'loot',
      title: 'Loot'
    },
    {
      id: 'tags',
      title: 'Tags'
    },
    {
      id: 'description',
      title: 'Description'
    },
  ],
});

function mapObjectiveToRecord({
  objective,
  path
}) {
  const levelNameRegex = /levels\/(.*?)\//;
  const [_, level] = levelNameRegex.exec(path);

  return {
    level,
    objective: objective.title,
    difficulty: 1,
    xp: objective.rewards.xp,
    ide: objective.show_ide,
    loot: objective.rewards.items,
    tags: '',
    description: objective.description,
  };
}

function shouldIncludeItem(item) {
  return (
    // item.path.includes('javascript') ||
    // item.path.includes('hacktoberfest') ||
    // item.path.includes('python') ||
    // item.path.includes('oss_elephpant') ||
    !item.path.includes('common') &&
    !item.path.includes('fog_owl') &&
    !item.path.includes('template_mission') &&
    !item.path.includes('twilio-video-build-app') &&
    !item.path.includes('vr_demo')
  );
}

klaw(levelsDir)
  .on('data', item => {
    if (!shouldIncludeItem(item)) {
      return;
    }

    if (isFileObjectiveJson(item.path)) {
      items.push(item.path);
    }
  })
  .on('end', async () => {
    const filePromises = items.map(async path => {
      return {
        path,
        objective: JSON.parse(await fs.readFile(path, 'utf-8'))
      };
    });

    const files = await Promise.all(filePromises);

    const records = files.map(mapObjectiveToRecord);

    csvWriter.writeRecords(records).then(() => {
      console.log('...Done');
    });
  });