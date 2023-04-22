import {
  remote
} from 'electron';
import isDev from 'electron-is-dev';
import ua from 'universal-analytics';

// Session tracking singleton
let sessionTrackingStarted = false;

let userAgent;
let UA_ID;

// Functionality to be exposed to module consumers
const analytics = {
  initializeAnalytics,
  appVersion: undefined,
  analyticsId: undefined,
  visitor: undefined,
  pageview,
  event,
};

function initializeAnalytics(state) {
  const {
    user: {
      guid
    }
  } = state;

  // Get app version - will be electron version in dev, actual app version in prod
  analytics.appVersion = remote.app.getVersion();
  userAgent = `${window.navigator.userAgent} // ${analytics.appVersion}`;

  analytics.analyticsId = guid;

  // Determine where to send data based on dev/prod build
  const UA_DEV = 'UA-135538733-1';
  const UA_PROD = 'UA-135538733-2';
  UA_ID = isDev ? UA_DEV : UA_PROD;

  // Create a visitor object to track analytics events
  analytics.visitor = ua(UA_ID, guid);

  // Set global properties to be sent with every hit
  analytics.visitor.set('ds', 'desktop');
  analytics.visitor.set('ua', userAgent);
  analytics.visitor.set('an', 'N/A');
  analytics.visitor.set('av', analytics.appVersion);
}

// Helper function to track a "page view" event - this allows us to cheat a bit
// And use Google Analytics' website-oriented dashboards/features
function pageview(path, title, options = {}) {
  const hit = {
    dt: title,
    dp: path,
  };

  // Determine if this is the first page view event since module load - if so,
  // begin session tracking
  if (!sessionTrackingStarted) {
    hit.sc = 'start';
    sessionTrackingStarted = true;
  }

  // Mix in any custom session parameters
  // analytics.visitor.pageview(Object.assign(hit, options)).send();
}

// Helper function to send an event
function event(category, action, label, value, pageTitle, pagePath) {
  /* analytics.visitor
    .event({
      ec: category,
      ea: action,
      el: label,
      ev: value,
      dt: pageTitle,
      dp: pagePath,
    })
    .send(); */
}

export default analytics;