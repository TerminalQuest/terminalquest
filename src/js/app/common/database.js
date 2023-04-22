import Dexie from 'dexie';

// Create new Dexie-managed IndexedDB instance
// Not renaming yet because I don't know if this name matters anymore
const db = new Dexie('TwilioQuest');

// Database schema and indexes
db.version(1).stores({
  completedObjectives: `
    ++id,objectiveName,missionName,completedOn,xp,&[objectiveName+missionName]
  `,
});

// Automatically open database
db.open().catch(err => {
  console.log('Could not intialize Dexie/IndexDB data store');
});

// Export database object
export default db;
