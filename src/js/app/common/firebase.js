const isDev = require('electron-is-dev');

/**
 * https://firebase.google.com/docs/projects/api-keys
 *
 * Quote from the Firebase doc linked above:
 *
 * API keys for Firebase are different from typical API keys
 * Unlike how API keys are typically used, API keys for Firebase services are
 * not used to control access to backend resources; that can only be done with
 * Firebase Security Rules (to control which users can access resources) and
 * App Check (to control which apps can access resources).
 *
 * Usually, you need to fastidiously guard API keys (for example, by using a
 * vault service or setting the keys as environment variables); however, API
 * keys for Firebase services are ok to include in code or checked-in config
 * files.
 */

const PROD_CONFIG = {
  apiKey: 'AIzaSyDI5g9d6XTQtUWT6tPqFNJf171sQ08N-ZA',
  authDomain: 'twilioquest-prod.firebaseapp.com',
  databaseURL: 'https://twilioquest-prod.firebaseio.com',
  projectId: 'twilioquest-prod',
  storageBucket: 'twilioquest-prod.appspot.com',
  messagingSenderId: '397868221836',
  appId: '1:397868221836:web:6c5aa1b51c913abd',
};

const DEV_CONFIG = {
  apiKey: 'AIzaSyC2K-GdtU3bLQ-KsBVh_pHQW4GaFWQekcU',
  authDomain: 'twilioquest-dev.firebaseapp.com',
  databaseURL: 'https://twilioquest-dev.firebaseio.com',
  projectId: 'twilioquest-dev',
  storageBucket: 'twilioquest-dev.appspot.com',
  messagingSenderId: '64086769119',
  appId: '1:64086769119:web:8814deb9dfccf55f',
};

firebase.initializeApp(isDev ? DEV_CONFIG : PROD_CONFIG);

export const Firestore = firebase.firestore();
