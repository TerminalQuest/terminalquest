// Namespace for all code runner related modules and data - we are going to
// use eval for now to execute the developer's code, so we'll keep our stuff
// obfuscated in the global scope
const ___cr___ = {
  // Capture original console log functions so we can override them later
  console: {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  },

  // failsafe to ensure we only duck punch the console methods once
  methodsDuckPunched: false,

  // Override console log methods
  duckPunch() {
    console.log = function() {
      ___cr___.console.log.apply(console, arguments);
      ___cr___.log('log', arguments);
    };

    console.info = function() {
      ___cr___.console.info.apply(console, arguments);
      ___cr___.log('info', arguments);
    };

    console.warn = function() {
      ___cr___.console.warn.apply(console, arguments);
      ___cr___.log('warn', arguments);
    };

    console.error = function() {
      ___cr___.console.error.apply(console, arguments);
      ___cr___.log('error', arguments);
    };
  },

  // helper function to send a log message back to other open windows
  log(logLevel, args) {
    const BrowserWindow = require('electron').remote.BrowserWindow;
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(w => {
      w.webContents.send('code_runner:log', {
        logLevel,
        arguments: Array.prototype.slice.call(args),
      });
    });
  },

  // Handle uncaught errors
  uncaught(e) {
    // Get an error object from an unhandled promise rejection
    if (e.reason) {
      e = e.reason;
    }

    // Get an error message if one is provided
    let message = e.message;
    if (!message) {
      message =
        typeof e === 'string'
          ? e
          : 'Uncaught exception encountered - check your async code.';
    }

    // Use our duck-punched error handler
    console.error({
      message,
      stack: e.stack || '',
    });
  },
};

// Handle any uncaught errors we can
process.on('uncaughtException', ___cr___.uncaught);
window.addEventListener('onerror', ___cr___.uncaught);
window.addEventListener('unhandledrejection', ___cr___.uncaught);

// Eval code that's been written to disk by the IDE
require('electron').ipcRenderer.on('runWithEnv', (event, payload) => {
  // If env is null, don't run (this happens when code runner window is
  // initialized)
  if (!payload.env) {
    return;
  }

  // Only override the console methods once
  if (!___cr___.methodsDuckPunched) {
    ___cr___.duckPunch();
    ___cr___.methodsDuckPunched = true;
  }

  // Override process.env values with values provided
  Object.assign(process.env, payload.env);
  // Injecting "require" into the global object, which the vm instance uses as context
  // and makes accessible to users via the QuestIDE
  Object.assign(global, { require });

  // Read in contents of requested file and run it! YOLO!
  const code = require('fs-jetpack').read(payload.appCodePath);

  // Hard coding polyfill of String.replaceAll, since the version of electron we're using (as of 11/16/2022)
  // doesn't have a new enough version of Node to natively support it
  const extendedUserCode = `
      /**
       * String.prototype.replaceAll() polyfill
       * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
       * @author Chris Ferdinandi
       * @license MIT
       */
      if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function(str, newStr) {
          // If a regex pattern
          if (
            Object.prototype.toString.call(str).toLowerCase() ===
            '[object regexp]'
          ) {
            return this.replace(str, newStr);
          }

          // If a string
          return this.replace(new RegExp(str, 'g'), newStr);
        };
      }
      
      // Marvel Johnson [12/14/2022] A workaround to a validation bug which lives in
      // the TwilioQuest-Server's /magic route. When used, it will fake requests that include
      // the queried divination endpoint and treat all others normally (i.e. by using the regular fetch implementation).
      // This method has been added to the validation helper so that it's accessible to the API Academy
      // api-05-get-patch objective validator.
      async function fetchOverride(input, init = { method: 'GET', body: {} }) {
        if (
          input &&
          input.includes(
            'https://twilio.com/quest/magic/divination?target=lovelace_secret_statue'
          )
        ) {
          if (!this.fakeFetch) {
            this.fakeFetch = {};
          }
    
          const response = {
            body: {
              data: {
                inscription: '',
                operational: false,
              },
            },
            // Only adding this because the player will have been introduced to it in a previous objective
            async text() {
              return this.body;
            },
            async json() {
              return this.body;
            },
          };
    
          const inscriptionIsCorrect = inscription => {
            const inscriptionLowercased = inscription
              .replace(/[^A-z ]/g, '')
              .toLowerCase();

            return (
              inscriptionLowercased.includes('creators of the cloud') &&
              inscriptionLowercased.includes('formed through a simple') &&
              inscriptionLowercased.includes('strung together') &&
              inscriptionLowercased.includes('requests may return') &&
              inscriptionLowercased.includes('the towers supply') &&
              inscriptionLowercased.includes('stay locked until i am able to') &&
              inscriptionLowercased.includes('magical eye')
            );
          };
    
          if (input.includes('guid=')) {
            const inscription = this.fakeFetch.inscription
              ? this.fakeFetch.inscription
              : '';
    
            if (inscriptionIsCorrect(inscription)) {
              response.body.data.operational = true;
            } else {
              response.body = {
                errorMessage:
                  'The inscription is still corrupted! Double check your work and try again.',
              };
            }
          } else {
            const method = init.method.toLowerCase();
    
            switch (method) {
              case 'patch':
                try {
                  JSON.parse(init.body);
                } catch (_) {
                  response.body = {
                    errorMessage:
                      'Your request "body" is not JSON parsable! Double check the objective description on how to send the patch request and try again.',
                  };
    
                  return response;
                }

                const jsonBody = JSON.parse(init.body);
    
                if (
                  jsonBody.guid === undefined ||
                  jsonBody.data === undefined ||
                  jsonBody.data.inscription === undefined
                ) {
                  response.body = {
                    errorMessage: \`Your patch is missing the "\${
                      jsonBody.guid === undefined
                        ? 'guid'
                        : jsonBody.data === undefined
                        ? 'data'
                        : jsonBody.data.inscription === undefined
                        ? 'data.inscription'
                        : ''
                    }" property! Double check that your formatting matches what is shown in the objective description and try again.\`,
                  };
                } else if (!inscriptionIsCorrect(jsonBody.data.inscription)) {
                  response.body = {
                    errorMessage:
                      'The inscription is still corrupted! Double check your work and try again.',
                  };
                } else {
                  this.fakeFetch.inscription = jsonBody.data.inscription;
                  response.body = {
                    message: 'Your patch was received!',
                  };
                }
                break;
              case 'get':
                response.body.data.inscription = \`Oh, great adGRTgfhuwef, let me apply\n\
This divination spell, newly *77hjfslkefWSghu3 phrase,\n\
Anvnteu398gtEWRbkyrU thanks to a most helpful API,\n\n\
That my LIUH4f92nfsDBHerWAGYito the knowledge I seek\n\
To open my mind to JHBUfRRE#234ijgyREvd\n\
Of resources both clear and covert.\n\n\
For the final door shall 99234jtgeRasER$TGWE49 scry\n\
The programmable answers that will remove this haze\n\
From my querent and OOIJBUe11239sdSBs.\`;
                break;
              default:
                response.body = {
                  errorMessage: \`TwilioQuest did not expect "\${method}" as the request method! Make sure you're using "PATCH" and try again.\`,
                };
            }
          }
    
          return response;
        } else {
          return originalFetch(...arguments);
        }
      }

      const { fetch: originalFetch } = this;
      fetch = fetchOverride.bind(this);

      ${code};
    `;
  try {
    require('vm').runInThisContext(extendedUserCode, {
      filename: 'script.js',
    });
  } catch (e) {
    console.error('There was a problem executing your code:', {
      message: e.message,
      stack: e.stack,
    });
  }
});
