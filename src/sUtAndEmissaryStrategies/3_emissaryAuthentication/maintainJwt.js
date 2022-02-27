// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { promises as fsPromises } from 'fs';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import config from '../../../config/config.js';
import EmissaryAuthentication from './strategy.js';
import { percentEncode } from '../../strings/index.js';

const rndBytes = promisify(randomBytes);

// Doc: https://www.zaproxy.org/docs/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authmethods/
// Doc: https://www.zaproxy.org/docs/api/#getting-authenticated
// Doc: https://docs.google.com/document/d/1LSg8CMb4LI5yP-8jYDTVJw1ZIJD2W_WDWXLtJNk3rsQ/edit#

class MaintainJwt extends EmissaryAuthentication {
  #sutPropertiesSubSet;
  #setUserId;
  #emissaryPropertiesSubSet;
  #fileName = 'maintainJwt';

  constructor({ log, publisher, baseUrl, sutPropertiesSubSet, setUserId, emissaryPropertiesSubSet, zAp }) {
    super({ log, publisher, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#setUserId = setUserId;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const {
      authentication: { route: loginRoute },
      loggedInIndicator,
      loggedOutIndicator,
      testSession: { id: testSessionId, attributes: { username, excludedRoutes } },
      context: { id: contextId, name: contextName }
    } = this.#sutPropertiesSubSet;
    const password = ''; // Seems to be required for formBasedAuthentication.

    const loggedInOutIndicator = {
      command: loggedInIndicator ? 'setLoggedInIndicator' : 'setLoggedOutIndicator',
      value: loggedInIndicator || loggedOutIndicator,
      secondParamName: loggedInIndicator ? 'loggedInIndicatorRegex' : 'loggedOutIndicatorRegex'
    };

    const { uploadDir: emissaryUploadDir, spider: { maxDepth, threadCount } } = this.#emissaryPropertiesSubSet;
    const { dir: appTesterUploadDir } = config.get('upload');
    const enabled = true;
    const authenticationMethod = 'formBasedAuthentication';
    let userId;
    const script = {
      name: 'maintainJwt',
      fileName: 'maintainJwt.js',
      type: 'httpsender',
      engine: 'Oracle Nashorn',
      sourcePath: `${process.cwd()}/src/sUtAndEmissaryStrategies/3_emissaryAuthentication/scripts/maintainJwt.js`
    };
    const authMethodConfigParams = `loginUrl=${percentEncode(`${this.baseUrl}${loginRoute}`)}&loginPageUrl=${percentEncode(`${this.baseUrl}${loginRoute}`)}`;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    // Need to copy file as unique name so that another Test Session is unable to delete it before we load it into the Emissary.
    let rndFilePrefix = '';
    await rndBytes(4)
      .then((buf) => {
        rndFilePrefix = buf.toString('hex');
      })
      .catch((err) => {
        const adminErrorText = `Error (non fatal) occurred while attempting to get randomBytes for file prefix, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
    await fsPromises.copyFile(script.sourcePath, `${appTesterUploadDir}${rndFilePrefix}-${script.fileName}`)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Script: "${script.fileName}" was successfully copied to the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to copy the script: "${script.fileName}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.script.load({ scriptName: script.name, scriptType: script.type, scriptEngine: script.engine, fileName: `${emissaryUploadDir}${rndFilePrefix}-${script.fileName}`, scriptDescription: `Used by the ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}"` })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Loaded: "${script.type}" script: "${script.fileName}" into the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the: "${script.type}" script: "${script.fileName}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.script.enable({ scriptName: script.name })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Enabled: "${script.type}" script: "${script.fileName}" in the Emissary, for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the: "${script.type}" script: "${script.fileName}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${rndFilePrefix}-${script.fileName}`)
      .then(() => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Removed script: "${script.fileName}" from the App Tester upload directory.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the script: "${script.fileName}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
    await this.zAp.aPi.spider.setOptionMaxDepth({ Integer: maxDepth })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider max depth to: "${maxDepth}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider max depth, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.spider.setOptionThreadCount({ Integer: threadCount })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set the spider thread count to: "${threadCount}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider thread count, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    const contextTarget = `${this.baseUrl}.*`;

    await this.zAp.aPi.context.includeInContext({ contextName, regex: contextTarget })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Added URI: "${contextTarget}" to Zap include-in-context: "${contextName}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add URI: "${contextTarget}" to Zap include-in-context: "${contextName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    await Promise.all(excludedRoutes.map(async (eR) => {
      await this.zAp.aPi.context.excludeFromContext({ contextName, regex: eR })
        .then((resp) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Added URI: "${eR}" to Zap exclude-from-context: "${contextName}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to add URI: "${eR}" to Zap exclude-from-context: "${contextName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          throw new Error(errorText);
        });
    }));

    await this.zAp.aPi.authentication.setAuthenticationMethod({ contextId, authMethodName: authenticationMethod, authMethodConfigParams })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set authentication method for contextId: "${contextId}" to: "${authenticationMethod}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set authentication method to "${authenticationMethod}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    // Tested regular expression \\b(Unauthorized|Forbidden)\\b ends up being the following in Zap: \b(Unauthorized|Forbidden)\b
    await this.zAp.aPi.authentication[loggedInOutIndicator.command]({ contextId, [loggedInOutIndicator.secondParamName]: loggedInOutIndicator.value })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `${loggedInOutIndicator.command} for contextId: "${contextId}" to: "${loggedInOutIndicator.value}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to: ${loggedInOutIndicator.command} to: "${loggedInOutIndicator.value}", for test session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });

    await this.zAp.aPi.users.newUser({ contextId, name: username })
      .then((resp) => {
        userId = resp.userId;
        this.#setUserId(userId);
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Add the newUser: "${username}" of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add the newUser "${username}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    // Setting a username is essential it seems, even when it's not part of the authentication strategy.
    await this.zAp.aPi.users.setAuthenticationCredentials({ contextId, userId, authCredentialsConfigParams: `username=${username}&password=${percentEncode(password)}` })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set authentication credentials, of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set authentication credentials, of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.users.setUserEnabled({ contextId, userId, enabled })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set user enabled on user with id: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set user enabled with id: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUser({ contextId, userId })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user with Id: "${userId}" of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user: "${userId}", of contextId: "${contextId}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUserModeEnabled({ boolean: enabled })
      .then((resp) => {
        this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Set forced user mode enabled to: "${enabled}", for Test Session with id: "${testSessionId}". Response was: ${JSON.stringify(resp)}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user mode enabled to: "${enabled}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      });
  }
}

export default MaintainJwt;
