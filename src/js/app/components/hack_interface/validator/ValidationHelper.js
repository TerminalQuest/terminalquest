import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { Twilio } from 'twilio';
import { exec } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import vm from 'vm';
import path from 'path';
import ga from '../../../common/analytics';
import World from '../../../common/world';
import config from '../../../config/config';
import { getContext } from '../../../common/context';
const fetch = window.fetch;

export default class ValidationHelper {
  constructor(validationContext, callback, level) {
    // Instance variables
    this.validationCallback = callback;
    this.validationFields = {};
    this.context = validationContext.context;
    this.env = validationContext.env;
    this.client = null;
    this.fakeNumber = '+12025550136';
    this.analyticsId = ga.analyticsId;
    this.world = new World(level);

    // Process validation fields
    Object.keys(validationContext.validationFields).forEach(key => {
      const val = validationContext.validationFields[key].trim();
      this.validationFields[key] = val;
    });
  }

  getNormalizedInput(key, { lowerCase = true, trim = true } = {}) {
    let val = this.validationFields[key];

    if (!val) return '';

    if (trim) {
      val = val.trim();
    }

    if (lowerCase) {
      val = val.toLowerCase();
    }

    return val;
  }

  /*
  Retrieve an authenticated Twilio client using system environment variables.
  Throw an error if the necessary variables have not been defined.
  */
  getTwilioClient() {
    if (this.client !== null) {
      return this.client;
    }
    const accountSid = this.env.TQ_TWILIO_ACCOUNT_SID;
    const authToken = this.env.TQ_TWILIO_AUTH_TOKEN;

    try {
      this.client = new Twilio(accountSid, authToken);
      return this.client;
    } catch (e) {
      throw new Error(`
        It seems you don't have a valid Twilio account configured - 
        open the Settings UI to double check your Twilio account configuration 
        variables.
      `);
    }
  }

  // Helper to invoke the validation callback with a success message
  success(message, env = []) {
    this.validationCallback(null, { message, env });
  }

  // Helper to invoke the validation callback with an error message
  fail(error, errorCodeMessage) {
    let message = error;
    if (typeof error !== 'string') {
      message = error.message;
      if (error.code && errorCodeMessage && errorCodeMessage[error.code]) {
        message = errorCodeMessage[error.code];
      }
    }
    this.validationCallback({ message });
  }

  // Helper to validate a phone number using either the configured Twilio
  // account credentials, or a provided client
  findPhoneNumber(phoneNumber, client) {
    return new Promise((resolve, reject) => {
      try {
        client = client || this.getTwilioClient();
        let number;
        client.incomingPhoneNumbers.each({
          phoneNumber,
          callback: incoming => (number = incoming),
          done: err => {
            if (err) {
              return reject(err);
            }
            if (number) {
              resolve(number);
            } else {
              reject(`Couldn't find ${phoneNumber}. Please try again`);
            }
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Helper function to create a signature for fake webhook requests
  createSignature(signUrl, params, token) {
    Object.keys(params)
      .sort()
      .forEach(key => {
        signUrl = signUrl + key + params[key];
      });
    return crypto
      .createHmac('sha1', token)
      .update(Buffer.from(signUrl, 'utf-8'))
      .digest('Base64');
  }

  // Helper function to make a mock call request to an HTTP endpoint
  async fakeCall(webhookUrl, to, from, parameterOverrides = {}, client) {
    client = client || this.getTwilioClient();

    // POST body to send to the Twilio webhook endpoint
    const params = {
      ApiVersion: '2010-04-01',
      Called: to,
      To: to,
      Caller: from,
      From: from,
      Direction: 'inbound',
      CallStatus: 'ringing',
    };
    Object.assign(params, parameterOverrides);

    return await this.getTwiML(webhookUrl, params, client);
  }

  // Helper to send a mocked SMS webhook request
  async fakeMessage(webhookUrl, to, from, parameterOverrides = {}, client) {
    client = client || this.getTwilioClient();

    const params = {
      ApiVersion: '2010-04-01',
      To: to,
      From: from,
      Body: 'Test message sent by TwilioQuest',
    };
    Object.assign(params, parameterOverrides);

    return await this.getTwiML(webhookUrl, params, client);
  }

  // Make a signed request to a Twilio webhook URL
  async fakeRequest(webhookUrl, parameters, client, method = 'POST') {
    client = client || this.getTwilioClient();
    const userAgent = `twilioquest/${process.env.npm_package_version} (node.js ${process.version})`;
    parameters.AccountSid = client.accountSid;

    const fetchParams = {
      method,
      headers: {
        'X-Twilio-Signature': this.createSignature(
          webhookUrl,
          parameters,
          client.password
        ),
        'User-Agent': userAgent,
        'Accept-Charset': 'utf-8',
      },
    };

    if (method === 'POST') {
      fetchParams.headers['Content-Type'] =
        'application/x-www-form-urlencoded;charset=UTF-8';
      fetchParams.body = new URLSearchParams(parameters);
    }

    const response = await fetch(webhookUrl, fetchParams);
    return response;
  }

  async getTwiML(webhookUrl, parameters, client) {
    client = client || this.getTwilioClient();
    const response = await this.fakeRequest(webhookUrl, parameters, client);
    if (!response.ok) {
      throw `
        Oh no there seems to be a problem with your TwiML generation. 
        Status code: ${response.statusCode}
      `;
    }
    const responseText = await response.text();
    return cheerio.load(responseText);
  }

  /**
   * @typedef {Array} ValidationTuple
   * @property {Boolean} ValidationTuple.0 - isValid - True if the executable can be executed without error, false otherwise.
   * @property {String} ValidationTuple.1 - message - Returns a message with more information if an error occurs while attempting to validate the executable.
   */

  /**
   * Determines if an executable can be executed and used by TwilioQuest.
   *
   * @param {String} path - file path to the executable under test
   * @param {String[]} args - an array of strings that will be joined by a space character representing the command line arguments needed to determine if the executable under test can be executed. This is usually something like: ['--version'].
   * @returns {ValidationTuple}
   * @throws This function will catch may common exe validation errors. If an unexpected error occurs, this function will still throw that error.
   */
  async isExecutableValid(path, args) {
    if (path === undefined || path.trim() === '') {
      return [false, `You didn't enter a file path.`];
    }

    /**
     * We're using fs here instead of jetpack.exists due to a bug in their
     * implementation. Jetpack's function relies on fs.stat which does not
     * work for Windows Store installed apps that land in the `WindowsApp`
     * directory.
     *
     * This looks like it will be fixed in some future version of Node.js.
     *
     * Source issues: https://github.com/nodejs/node/issues/33024
     *                https://github.com/microsoft/vscode/issues/95828
     * This is true as of: 8/26/2020.
     */
    if (!existsSync(path)) {
      return [
        false,
        `The path you provided does not exist!
      
        "${path}"
        `,
      ];
    }

    try {
      await new Promise((resolve, reject) => {
        exec(
          `"${path}" ${args.join(' ')}`,
          {
            // empty settings object
          },
          error => {
            if (error) {
              return reject(error);
            }

            return resolve();
          }
        );
      });
    } catch (err) {
      // EPERM is an access error that comes from child_process.spawn.
      // When a user doesn't have permissions for child_process.exec, the
      // error message contains some permutation of "access denied".
      if (
        err.message.includes('EPERM') ||
        (err.message.toLowerCase().includes('access') &&
          err.message.toLowerCase().includes('denied'))
      ) {
        return [
          false,
          `The path you provided isn't executable!

        Please ensure this is a path to an executable and that TwilioQuest has
        the appropriate permissions to execute the file.
        
        "${path}"
        `,
        ];
      }

      return [
        false,
        `An error occured when we tried to validate we could run your executable!

      Path: ${path}
      Error: ${err}
      `,
      ];
    }

    return [true, undefined];
  }

  async getQuestIdeUserCode(objective, mission) {
    if (!mission) {
      // use current mission by default
      mission = getContext('currentLevel').levelName;
    }

    const savedCodePath = path.join(
      config.codeStoragePath,
      mission,
      objective,
      config.codeStorageFileName
    );

    const userCode = await fs.readFile(savedCodePath, 'utf8');

    return userCode;
  }

  async evalQuestIdeUserCode(objective, mission) {
    const userCode = await this.getQuestIdeUserCode(objective, mission);

    eval(userCode);
  }

  async pullVarsFromQuestIdeUserCodeLocalScope(keys = [], objective, mission) {
    const userCode = await this.getQuestIdeUserCode(objective, mission);
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

      ${userCode};
    `;

    const scriptContext = {
      fetch: this.fetchOverride.bind(this),
      window,
      process,
      URL,
      URLSearchParams,
      require,
      __TQ: {},
    };
    const testCode = `
      ${extendedUserCode};
      
      try {
        ${keys
          .map(key => {
            return `__TQ["${key}"] = ${key};`;
          })
          .join('\n')}
      } catch (error) {
        __TQ._error = error;
      }
    `;

    // First, execute user code to ensure it runs unchanged
    let script = new vm.Script(extendedUserCode);
    script.runInNewContext(Object.assign({}, scriptContext));

    // Assuming that it doesn't throw, we can try running it with our test
    // code appended to it.
    script = new vm.Script(testCode);
    script.runInNewContext(scriptContext);

    // Inspect the script context for the stuff we want
    const context = scriptContext.__TQ;

    return context;
  }

  getFilePathPartsArray(filePath) {
    const parts = filePath.split(path.sep);

    return parts;
  }

  areArrayContentsEqual(arrayA, arrayB, comparatorFn = (a, b) => a === b) {
    if (arrayA.length !== arrayB.length) {
      return false;
    }

    return arrayA.every((itemA, index) => {
      return comparatorFn(itemA, arrayB[index]);
    });
  }

  formatPathPartsForOs(...parts) {
    return parts.join(path.sep);
  }

  /**
   * Creates a string out of the input's value and wraps it in symbols which denote it's type
   * @param {*} input - The input to be wrapped and stringified
   */
  formatByType(input) {
    let output = input;

    if (typeof input === 'string') output = `"${input}"`;
    else if (Array.isArray(input)) output = `[${input}]`;
    else if (typeof input === 'object') output = JSON.stringify(input);

    return output;
  }

  // Marvel Johnson [12/14/2022] A workaround to a validation bug which lives in
  // the TwilioQuest-Server's /magic route. When used, it will fake requests that include
  // the queried divination endpoint and treat all others normally (i.e. by using the regular fetch implementation).
  // This method has been added to the validation helper so that it's accessible to the API Academy
  // api-05-get-patch objective validator.
  async fetchOverride(input, init = { method: 'GET', body: {} }) {
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
                errorMessage: `Your patch is missing the "${
                  jsonBody.guid === undefined
                    ? 'guid'
                    : jsonBody.data === undefined
                    ? 'data'
                    : jsonBody.data.inscription === undefined
                    ? 'data.inscription'
                    : ''
                }" property! Double check that your formatting matches what is shown in the objective description and try again.`,
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
            response.body.data.inscription = `Oh, great adGRTgfhuwef, let me apply\n\
This divination spell, newly *77hjfslkefWSghu3 phrase,\n\
Anvnteu398gtEWRbkyrU thanks to a most helpful API,\n\n\
That my LIUH4f92nfsDBHerWAGYito the knowledge I seek\n\
To open my mind to JHBUfRRE#234ijgyREvd\n\
Of resources both clear and covert.\n\n\
For the final door shall 99234jtgeRasER$TGWE49 scry\n\
The programmable answers that will remove this haze\n\
From my querent and OOIJBUe11239sdSBs.`;
            break;
          default:
            response.body = {
              errorMessage: `TwilioQuest did not expect "${method}" as the request method! Make sure you're using "PATCH" and try again.`,
            };
        }
      }

      return response;
    } else {
      return fetch(...arguments);
    }
  }
}
