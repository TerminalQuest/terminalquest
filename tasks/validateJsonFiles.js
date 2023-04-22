const klaw = require('klaw');
const through2 = require('through2');
const path = require('path');
const fs = require('fs').promises;

const items = []; // files, directories, symlinks, etc

const inputFilePath = process.argv[2];
const cwd = process.cwd();
const filePath = path.resolve(cwd, inputFilePath);

console.log(`Searching "${filePath}" for JSON files.`);

const excludeNodeModulesDir = through2.obj(function(item, enc, next) {
  if (!item.path.includes('node_modules')) this.push(item);
  next();
});

const excludeNonJsonFiles = through2.obj(function(item, enc, next) {
  if (item.path.includes('.json')) this.push(item);
  next();
});

klaw(filePath, { preserveSymlinks: true })
  .pipe(excludeNodeModulesDir)
  .pipe(excludeNonJsonFiles)
  .on('data', item => items.push(item.path))
  .on('end', async () => {
    console.log(`Found ${items.length} JSON files. Validating each.`);

    for (let item of items) {
      try {
        const fileText = await fs.readFile(item, 'utf8');
        const jsonPayload = JSON.parse(fileText);
      } catch (err) {
        console.error(`Failed to parse JSON file: "${item}"`);
        console.error(err.message);
      }
    }
  });
