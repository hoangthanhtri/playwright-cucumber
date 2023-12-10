import { BeforeAll, AfterAll, Before, After, AfterStep, BeforeStep } from "@cucumber/cucumber";
import { Browser, Page,BrowserContext} from "playwright";
import getEnv from "../helper/env/env";
import {ReportPortal} from "../helper/report/report-portal";
import { ReportPortalConnection as ReportPortalConnection } from "../types/types";
import { invokeBrowser } from "../helper/browser-manager/browser-manager";
import { CustomWorld } from "./custom-world";



let reportPortalLaunchId: string;
let reportPortalFeatureId: string;
let reportPortalScenarioId: string;
let reportPortalStepId: string;
let testType: string | undefined;
    // @ts-ignore
let browser: Browser;
let context: BrowserContext;

export let page : Page;

BeforeAll(async () => {

    getEnv();
    
    testType = process.argv.slice(4)[0];
    
    const launchName = 'tmp';
    const projectName = process.env.PROJECT_NAME;
    const reportPortalToken = process.env.REPORT_PORTAL_TOKEN;
    const reportPortalEndpoint = process.env.REPORT_PORTAL_ENDPOINT;
    const isLaunchMergeRequired :boolean = (process.env.IS_LAUNCH_MERGE_REQUIRED ==='true');
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
      debug: false,
      launchUuidPrint: false,
      isLaunchMergeRequired:isLaunchMergeRequired,    
    }

    await ReportPortal.init(reportPortalConnection);

    if(!launchName) throw new Error('Launch name is not defined');
    reportPortalLaunchId = await ReportPortal.startLaunch(launchName) ;
    if(!reportPortalLaunchId ) throw new Error('Cannot start launch');   
    
    if(testType === 'ui'){
      browser = await invokeBrowser();
    }

  
});
AfterAll(async () => {
  if(reportPortalLaunchId) await ReportPortal.reportClose(reportPortalLaunchId)
});

Before(async function (this: CustomWorld, { pickle,gherkinDocument }) {
 
  if(!reportPortalFeatureId || reportPortalFeatureId === ''){    
    reportPortalFeatureId = ReportPortal.startFeature(reportPortalLaunchId, gherkinDocument,pickle);
  }
  console.log('before')

  reportPortalScenarioId = ReportPortal.startScenario(reportPortalLaunchId,reportPortalFeatureId, pickle);
  if(testType === 'ui'){
    const scenarioName = pickle.name + pickle.id
    context = await browser.newContext();
    await context.tracing.start({
        name: scenarioName,
        title: pickle.name,
        sources: true,
        screenshots: true, snapshots: true
    });
    this.browser = browser;
    this.page = await context.newPage();
  }

});

After(async function ( this: CustomWorld, { pickle,result,gherkinDocument }) {
  if(!result) throw new Error("Result is not defined")
  if(!result.message) throw new Error("Result message is not defined")
  ReportPortal.finishScenario(reportPortalScenarioId, result);
  ReportPortal.finishFeature(reportPortalFeatureId,pickle, gherkinDocument);
  

  if(testType === 'ui'){    

    await context.tracing.stop();
    await context.close();
    await this.page?.close();
    await this.browser?.close();

  }
});

BeforeStep(async function ({ pickleStep }) {
   reportPortalStepId =  ReportPortal.startStep(reportPortalLaunchId,reportPortalScenarioId, pickleStep)  
});

AfterStep(async function (this: CustomWorld, { result }) {
  if(!result) throw new Error("Result is not defined");

  let img = await this.page?.screenshot({fullPage: true});
  if(img){
    
    const imageBase64 = img.toString('base64');
    console.log(imageBase64)
    ReportPortal.stepLogs(reportPortalStepId, result,imageBase64,'screenshot.png');
  }
  else{
    ReportPortal.stepLogs(reportPortalStepId, result);
  }
  ReportPortal.finishStep(reportPortalStepId, result);
});





