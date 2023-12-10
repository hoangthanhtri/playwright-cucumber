import {ReportPortal} from "./report-portal";
import { ReportPortalConnection , MergeLaunchesOptions } from "../../types/types";
import { Browser, Page, chromium} from "playwright";
import getEnv from "../env/env";
import * as glob from 'glob';
import * as fs from 'fs';


export class ReportRunner{

    static browser: Browser;
    
    static reportPortalLaunchId: string;
    static reportPortalFeatureId: string;
    static reportPortalScenarioId: string;
    static reportPortalStepId: string;
    static isLaunchInitFromPipeline: boolean = false;
    

    static async mergeLaunches() {
        getEnv();
        const launchName = process.env.LAUNCH_NAME;
        const projectName = process.env.PROJECT_NAME;
        const reportPortalToken = process.env.REPORT_PORTAL_TOKEN;
        const reportPortalEndpoint = process.env.REPORT_PORTAL_ENDPOINT;
        const isLaunchMergeRequired = process.env.IS_LAUNCH_MERGE_REQUIRED;
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
            isLaunchMergeRequired: true,    
          }

        await ReportPortal.init(reportPortalConnection);
        
        const mergeLaunchesOptions : MergeLaunchesOptions = {
            mergeType: 'BASIC',
            name: launchName,
            description: 'Merge all launches'
        }

        await ReportPortal.megereLaunches(mergeLaunchesOptions);
    }

    static async removeAllTempFile(){
        try {
            const files = glob.sync('rplaunch-*.tmp');
            files.forEach(file => {
                try {
                    fs.unlinkSync(file);
                    console.log(`Deleted file: ${file}`);
                } catch (err) {
                    console.error(`Error deleting file ${file}:`, err);
                }
            });
        } catch (err) {
            console.error('Error finding temporary files:', err);
        }
    }
    
    static async run(){
        await this.mergeLaunches();
        await this.removeAllTempFile();
    }

}

export default ReportRunner.run();