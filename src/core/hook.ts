import { BeforeAll, AfterAll, Before, After, AfterStep, BeforeStep } from "@cucumber/cucumber";
import { Browser, Page} from "playwright";
import getEnv from "./helper/env/env";
import {ReportPortal} from "./helper/report/report-portal";
import { ReportPortalConnection as ReportPortalConnection, ReportResponse } from "./types/types";

let browser: Browser;
let reportPortalLaunchId: string;
let reportPortalFeatureId: string;
let reportPortalScenarioId: string;
let reportPortalStepId: string;

// export let page :  Page | undefined; 


BeforeAll(async () => {

    getEnv();
    
    //check if run api testing or ui testing by npm script
    const testType = process.env.TEST_TYPE;
    const launchName = process.env.LAUNCH_NAME;
    const projectName = process.env.PROJECT_NAME;
    const reportPortalToken = process.env.REPORT_PORTAL_TOKEN;
    const reportPortalEndpoint = process.env.REPORT_PORTAL_ENDPOINT;
    reportPortalLaunchId = process.env.REPORT_PORTAL_LAUNCH_ID? process.env.REPORT_PORTAL_LAUNCH_ID : "";
    if(!testType) throw new Error('Test type is not defined');
    if(!launchName) throw new Error('Launch name is not defined');
    if(!projectName) throw new Error('Project name is not defined');
    if(!reportPortalToken) throw new Error('Report portal token is not defined');
    if(!reportPortalEndpoint) throw new Error('Report portal endpoint is not defined');


    const reportPortalConnection: ReportPortalConnection = {
      apiKey: reportPortalToken,
      endpoint: reportPortalEndpoint,
      launch: launchName,
      project: projectName,
      debug: false    
    }
    if(!launchName) throw new Error('Launch name is not defined');
    reportPortalLaunchId = await ReportPortal.reportInit(launchName, reportPortalConnection) ;
    if(!reportPortalLaunchId ) throw new Error("Can't init report portal");     

  
});
AfterAll(async () => {
  if(reportPortalLaunchId) await ReportPortal.reportClose(reportPortalLaunchId)
});

Before(async function ({ pickle,gherkinDocument }) {

 
  if(!reportPortalFeatureId || reportPortalFeatureId === ''){    
    reportPortalFeatureId = ReportPortal.startFeature(reportPortalLaunchId, gherkinDocument,pickle);
  }

  reportPortalScenarioId = ReportPortal.startScenario(reportPortalLaunchId,reportPortalFeatureId, pickle);
});

After(async function ({ pickle,result,gherkinDocument }) {
  if(!result) throw new Error("Result is not defined")
  await ReportPortal.finishScenario(reportPortalScenarioId, result);
  await ReportPortal.finishFeature(reportPortalFeatureId,pickle, gherkinDocument);
});

BeforeStep(async function ({ pickleStep }) {
   reportPortalStepId = ReportPortal.startStep(reportPortalLaunchId,reportPortalScenarioId, pickleStep)  
});

AfterStep(async function ({ result }) {
  if(!result) throw new Error("Result is not defined");
  ReportPortal.stepLogs(reportPortalStepId, result);
  ReportPortal.finishStep(reportPortalStepId, result);
});





