function isMigrationCompleted(key, state) {
  const {
    migrations
  } = state;

  return Boolean(migrations[key]);
}

function setMigrationCompleted(key, state) {
  const {
    migrations
  } = state;


  return {
    ...state,
    migrations: {
      ...migrations,
      [key]: true,
    },
  };
}

export {
  isMigrationCompleted,
  setMigrationCompleted
};