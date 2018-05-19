

const config = require('../../config/config');
const { Before, Given, When, Then } = require('cucumber');
const { expect } = require('code');
const { By } = require('selenium-webdriver');
const fs = require('fs');

/*
Before(() => {
  // Run before *every* scenario, no matter which feature or file.
  console.log('Im currently in a Before');

});
*/

Given('a new test session based on each build user supplied testSession', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { route: loginRoute, usernameFieldLocater, passwordFieldLocater, username, password } = this.sut.getProperties('authentication');
  await this.initialiseBrowser();
  const webDriver = this.sut.getBrowser().getWebDriver();

  await webDriver.getWindowHandle();
  await webDriver.get(`${sutBaseUrl}${loginRoute}`);
  await webDriver.sleep(1000);
  await webDriver.findElement(By.name(usernameFieldLocater)).sendKeys(username);
  await webDriver.findElement(By.name(passwordFieldLocater)).sendKeys(password);
  await webDriver.sleep(1000);
  await webDriver.findElement({
    tagName: 'button',
    type: 'submit'
  }).click();

});


Given('each build user supplied route of each testSession is navigated', async function () {

  // Todo: KC: Obviously need to iterate the array
  const sutAttackUrl = `${this.sut.baseUrl()}${this.sut.getProperties('testRoute')}`;
  const routeAttributes = this.sut.getProperties('routeAttributes');
  const webDriver = this.sut.getBrowser().getWebDriver();
  // Todo: KC: Fix hard coded sleeps.
  await webDriver.sleep(1000);
  await webDriver.get(sutAttackUrl)
  await webDriver.sleep(1000);
  await Promise.all(routeAttributes.attackFields.map( attackField => webDriver.findElement(By.name(attackField.name)).sendKeys(attackField.value) ));
  await webDriver.findElement(By.name(routeAttributes.submit)).click();
  await webDriver.sleep(1000);

});


let contextId;
let userId;
let scanId;
let aScanners;


const callbacks = {
  zapCallback(result) {
    debugger;
    console.log('In zapApiGenericFuncCallback.');
    if(result && result.contextId) contextId = result.contextId;
    if(result && result.userId) userId = result.userId;
    if(result && result.scanners) aScanners = result.scanners;
    console.log(`PT Admin: Response from the Zap API: ${JSON.stringify(result)}`);
    return;
  },
  zapErrorHandler(error) {
    debugger;
    console.log('In zapApiErrorHandler.');
    console.log(`Error occured calling the Zap API: ${error.message}`);
    return;
  }
};


Given('a new scanning session based on each build user supplied testSession', async function () {


  const contextName = this.sut.getProperties('context').name;
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();  
  // Closed over, so that the callbacks can access the variables in the outer scope.
  const closedOverCallbacks = callbacks;


    // Details around automated authentication detection and configuration: https://github.com/zaproxy/zaproxy/issues/4105

  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsContexts
  // Todo: KC: The context and it's Id should probably be set in conjunction with the purpleteam authenticated build user and their specific SUT url. This information will need to also be in requests for auditing.
  await zaproxy.context.newContext(contextName, apiKey, closedOverCallbacks);

  

// Todo: KC: Start with thenifying the zap client and my calls to it, at the same time tidy up the callbacks and get them ready for logging to PT Admin and PT Build User.
// .....................................................................................................................................................................











});




Given('the application is spidered for each testSession', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, username, password }, loggedInIndicator, testRoute, context: { name: contextName} } = this.sut.getProperties(['authentication', 'loggedInIndicator', 'testRoute', 'context']);
  const { apiKey, spider: { maxDepth, threadCount, maxChildren } } = this.zap.getProperties(['apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  
  // Closed over, so that the callbacks can access the variables in the outer scope.
  const closedOverCallbacks = callbacks;
  const enabled = true;

  await zaproxy.spider.setOptionMaxDepth(maxDepth, apiKey, closedOverCallbacks);
  await zaproxy.spider.setOptionThreadCount(threadCount, apiKey, closedOverCallbacks);
  await zaproxy.context.includeInContext(contextName, sutBaseUrl, apiKey, closedOverCallbacks);
  // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't work.
  // https://github.com/zaproxy/zaproxy/wiki/FAQformauth
  await zaproxy.authentication.setAuthenticationMethod(contextId, 'formBasedAuthentication', `loginUrl=${sutBaseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D%26_csrf%3D`, apiKey, closedOverCallbacks);
  // https://github.com/zaproxy/zap-core-help/wiki/HelpStartConceptsAuthentication
  await zaproxy.authentication.setLoggedInIndicator(contextId, loggedInIndicator, apiKey, closedOverCallbacks);
  await zaproxy.forcedUser.setForcedUserModeEnabled(enabled, apiKey, closedOverCallbacks);
  await zaproxy.users.newUser(contextId, username, apiKey, closedOverCallbacks);
  await zaproxy.forcedUser.setForcedUser(contextId, userId, apiKey, closedOverCallbacks);
  await zaproxy.users.setAuthenticationCredentials(contextId, userId, `username=${username}&password=${password}`, apiKey, closedOverCallbacks);
  await zaproxy.users.setUserEnabled(contextId, userId, enabled, apiKey, closedOverCallbacks);
  await zaproxy.spider.scan(sutBaseUrl, maxChildren, apiKey, closedOverCallbacks);
});


Given('all active scanners are disabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  const closedOverCallbacks = callbacks;
  const scanPolicyName = null;

  //await zaproxy.pscan.disableAllScanners(apiKey, closedOverCallbacks)
  //await zaproxy.pscan.enableAllScanners(apiKey, closedOverCallbacks)


  await zaproxy.ascan.disableAllScanners(scanPolicyName, apiKey, closedOverCallbacks)

});




Given('all active scanners are enabled', async function () {
  const apiKey = this.zap.getProperties('apiKey');
  const zaproxy = this.zap.getZaproxy();
  const { aScannerAttackStrength, aScannerAlertThreshold } = this.sut.getProperties('routeAttributes');
  const closedOverCallbacks = callbacks;
  const scanPolicyName = null;
  const policyid = null;


  const zapApiPrintEnabledAScanersFuncCallback = (result) => {
    debugger;

    console.log('In zapApiPrintEnabledAScanersFuncCallback.');

    const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name}, id: ${each.id}, enabled: ${each.enabled}, attackStrength: ${each.attackStrength}, alertThreshold: ${each.alertThreshold}`, '');
    
    // This is for the build user and the purpleteam admin:
    console.log(`PT Build User: The following are all the active scanners available with their current state:\n${scannersStateForBuildUser}`);
    // This is for the purpleteam admin only:
    console.log(`PT Admin: The following are all the active scanners available with their current state: ${JSON.stringify(result)}`);
    
    return;
  };

  debugger;
  await zaproxy.ascan.enableAllScanners(scanPolicyName, apiKey, closedOverCallbacks);
  debugger;

  await zaproxy.ascan.scanners(scanPolicyName, policyid, closedOverCallbacks);
  debugger;



  for (const ascanner of aScanners) {

    await zaproxy.ascan.setScannerAttackStrength(ascanner.id, aScannerAttackStrength, scanPolicyName, apiKey, callbacks);
    await zaproxy.ascan.setScannerAlertThreshold(ascanner.id, aScannerAlertThreshold, scanPolicyName, apiKey, callbacks);
  }
  debugger;



  await zaproxy.ascan.scanners(scanPolicyName, policyid, { zapCallback: zapApiPrintEnabledAScanersFuncCallback, zapErrorHandler: closedOverCallbacks.zapErrorHandler });
  debugger;

});





When('the active scan is run', async function () {

  const sutBaseUrl = this.sut.baseUrl();
  const { authentication: { route: loginRoute, username, password }, testRoute } = this.sut.getProperties(['authentication', 'testRoute']);

  const { apiFeedbackSpeed, apiKey, spider: { maxChildren } } = this.zap.getProperties(['apiFeedbackSpeed', 'apiKey', 'spider']);
  const zaproxy = this.zap.getZaproxy();
  const sutAttackUrl = `${sutBaseUrl}${testRoute}`;  

  let numberOfAlerts;
  // Closed over, so that the callbacks can access the variables in the outer scope.
  const closedOverCallbacks = callbacks;
  
  

  





  const zapApiAscanScanFuncCallback = (result) => {
    return new Promise((resolve, reject) => {
      let statusValue = 'no status yet';
      let zapError;
      let zapInProgressIntervalId;
      console.log(`Response from scan: ${JSON.stringify(result)}`); // eslint-disable-line no-console

      scanId = result.scan;
      async function status() {
        await zaproxy.ascan.status(scanId, {
          zapCallback: result => {
            if (result) statusValue = result.status;
            else statusValue = undefined;
          },
          zapErrorHandler: error => {
            if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
          }
        });
        await zaproxy.core.numberOfAlerts(sutAttackUrl, {
          zapCallback: result => {
            if(result) {
              ({ numberOfAlerts } = result);
            }
            console.log(`Scan ${scanId} is ${statusValue}% complete with ${numberOfAlerts} alerts.`); // eslint-disable-line no-console
          },
          zapErrorHandler: error => {
            zapError = error.message;
          }
        });
      }
      zapInProgressIntervalId = setInterval(() => {
        status();
        if ( (zapError && statusValue !== String(100)) || (statusValue === undefined) ) {
          console.log(`Canceling test. Zap API is unreachible. ${zapError ? 'Zap Error: ${zapError}' : 'No status value available, may be due to incorrect api key.'}`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          debugger;
          reject(`Test failure: ${zapError}`);          
        } else if (statusValue === String(100)) {
          console.log(`We are finishing scan ${scanId}. Please see the report for further details.`); // eslint-disable-line no-console
          clearInterval(zapInProgressIntervalId);
          debugger;
          resolve(`We are finishing scan ${scanId}. Please see the report for further details.`);
          status();
        }
      }, apiFeedbackSpeed);
    });
  };





  debugger;
  await zaproxy.spider.scanAsUser(sutBaseUrl, contextId, userId, maxChildren, apiKey, closedOverCallbacks);
  debugger;
  // Todo: Add the method to the test route requested by the build user. Default to POST
  await zaproxy.ascan.scan(sutAttackUrl, true, false, '', 'POST', 'firstName=JohnseleniumJohn&lastName=DoeseleniumDoe&ssn=seleniumSSN&dob=12/23/5678&bankAcc=seleniumBankAcc&bankRouting=0198212#&address=seleniumAddress&_csrf=&submit=', /* http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.*/ apiKey, {zapCallback: zapApiAscanScanFuncCallback, zapErrorHandler: closedOverCallbacks.zapErrorHandler});
  debugger;
  this.zap.numberOfAlerts(numberOfAlerts);
});


Then('the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap', function () {
  debugger;
  const numberOfAlerts = this.zap.numberOfAlerts();
  const { testRoute, routeAttributes: { alertThreshold } } = this.sut.getProperties(['testRoute', 'routeAttributes']);
  
  debugger  
  if (numberOfAlerts > alertThreshold) {
    // eslint-disable-next-line no-console
    console.log(`Search the generated report for "${testRoute}" to see the ${numberOfAlerts - alertThreshold} vulnerabilities that exceed the Build User defined threshold of: ${alertThreshold}`);
  }    
  expect(numberOfAlerts).to.be.at.most(alertThreshold);  
});


// Todo: KC: Should promisify the fs.writeFile along with wrapping the zap call in a promise
Then('the Zap report is written to file', async function () {
  debugger;
  const zaproxy = this.zap.getZaproxy();
  const { apiKey, reportDir } = this.zap.getProperties(['apiKey', 'reportDir']);
  const { testSessionId, testRoute } = this.sut.getProperties(['testSessionId', 'testRoute']);
  const closedOverCallbacks = callbacks;

  const zapApiHtmlReportFuncCallback = (result) => {
    debugger;
    return new Promise((resolve, reject) => {
      debugger;
      const date = new Date();
      const reportPath = `${reportDir}testSessionId-${testSessionId}_testRouteId${testRoute.split('/')[0]}_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}.html`;
      console.log(`Writing report to ${reportPath}`); // eslint-disable-line no-console
      fs.writeFile(reportPath, result, (writeFileErr) => {
        debugger;
        if (writeFileErr) {
          console.log(`Error writing report file to disk: ${writeFileErr}`); // eslint-disable-line no-console
          reject(`Error writing report file to disk: ${writeFileErr}`);
        }
      });
      //resolve('Done writing report file.');
      debugger;
      console.log('Done writing report file.');
      resolve('Done writing report file.');
    });
  };


  console.log('About to write report.'); // eslint-disable-line no-console
  await zaproxy.core.htmlreport(apiKey, {zapCallback: zapApiHtmlReportFuncCallback, zapErrorHandler: closedOverCallbacks.zapErrorHandler});
  debugger;
});
