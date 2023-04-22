const actionsCore = require('@actions/core');

function withActionsErrorReporting(wrappedFunction) {
  return async function() {
    try {
      await wrappedFunction();
    } catch (err) {
      actionsCore.setFailed(err.message);
    }
  };
}

module.exports = withActionsErrorReporting;
