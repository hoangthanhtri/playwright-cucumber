import {  ReportAttributes, ReportResponse, ReportPortalConnection,MergeLaunchesOptions } from '../../types/types';
import { ReportStatuses } from '../../types/enums';
import { GherkinDocument, Pickle, PickleStep, TestStepResult} from '@cucumber/messages'
//@ts-ignore
const RPClient = require('@reportportal/client-javascript');

export class  ReportPortal{

    private static reportClient: typeof RPClient | undefined; // Instance variable to store RPClient


   static async init(reportPortalConnection: ReportPortalConnection){
        if(!reportPortalConnection) throw new Error("Report portal connection is not defined");
        
        this.reportClient = new RPClient(reportPortalConnection);

        if(!this.reportClient) throw new Error("Can't init report portal");
        await this.reportClient.checkConnect().then(() => {
            console.log('Connected to ReportPortal');
        }).catch(() => {
            console.error('Error connecting to ReportPortal');
        });  
    }

    static async startLaunch(launchName: string,attributes?: ReportAttributes[], mode: 'DEFAULT'|'DEBUG' ='DEFAULT',description?: string): Promise<string>{
        if(!this.reportClient) throw new Error("Can't init report portal");
        const launchData = {
            name: launchName,
            startTime: this.reportClient.helpers.now(),
            description: description,
            attributes: attributes,
            mode: mode
        };

        const launchObj = await this.reportClient.startLaunch(launchData) as ReportResponse;        
        
        return launchObj.tempId;
    }

    static async reportClose(launchId: string){
        if(!this.reportClient) throw new Error("Can't init report portal");
        await this.reportClient.finishLaunch(launchId, {
            endTime: this.reportClient.helpers.now()
        });

        this.reportClient= undefined;

    }

    static startFeature(launchId: string,  gherkingDoc: GherkinDocument, pickle: Pickle , attributes?: ReportAttributes[], description?: string): string{
        if(!this.reportClient) throw new Error("Can't init report portal");
        let tempId: string;

        const dataObject = {
            description: description,
            name: pickle.name,
            startTime: this.reportClient.helpers.now(),
            type: 'SUITE',
            attributes: attributes
        }
        if(!description) delete dataObject.description;
        if(!attributes) delete dataObject.attributes;
        if ( gherkingDoc.feature && gherkingDoc.feature.children.length > 0) {
            const firstChild = gherkingDoc.feature.children[0];

            if (firstChild.scenario && firstChild.scenario.name === pickle.name) {
                const tempobj =  this.reportClient.startTestItem(dataObject, launchId) as ReportResponse;                
                tempId = tempobj.tempId;
                if(!tempId || tempId === '') throw new Error("Can't start feature");
                return tempId;
            }
        } 
        return '';
    }
    static async finishFeature(featureId: string,pickle: Pickle, gherkinDoc: GherkinDocument){
        if(!this.reportClient) throw new Error("Can't init report portal");
        //check if last scenario of feature
        if (gherkinDoc.feature && gherkinDoc.feature.children.length > 0) {
            const lastChild = gherkinDoc.feature.children[gherkinDoc.feature.children.length - 1];
            
            if (lastChild.scenario && lastChild.scenario.name === pickle.name) {
                await this.reportClient.finishTestItem(featureId, {
                    endTime: this.reportClient.helpers.now()
                });
            }
        }
    }

    static startScenario(launchId: string,featureId: string,  pickle: Pickle, attributes?: ReportAttributes[], description?: string): string{
        if(!this.reportClient) throw new Error("Can't init report portal");
        let tempId:string;

        const dataObject = {
            description: description,
            name: pickle.name,
            startTime: this.reportClient.helpers.now(),
            type: 'SCENARIO',
            attributes: attributes
        }
        if(!description) delete dataObject.description;
        if(!attributes) delete dataObject.attributes;
        
        const tempobj =  this.reportClient.startTestItem(dataObject, launchId,featureId) as ReportResponse;                
                tempId = tempobj.tempId;

        if(!tempId) throw new Error("Can't start scenario");
        return tempId;
    }

    static async finishScenario(scenarioId: string, result: TestStepResult){
        if(!this.reportClient) throw new Error("Can't init report portal");
        const dataObject = {
            endTime: this.reportClient.helpers.now(),
            status: this.convertCucumberStatusToReportPortalStatus(result.status)
        }
        
        return await this.reportClient.finishTestItem(scenarioId,dataObject);
    }

    static startStep(launchId: string,scenarioId: string,  pickleStep: PickleStep, attributes?: ReportAttributes[], description?: string): string{
        if(!this.reportClient) throw new Error("Can't init report portal");
        let tempId:string;
        
        const dataObject = {
            description: description,
            name: pickleStep.text,
            startTime: this.reportClient.helpers.now(),
            type: 'STEP',
            hasStats: false,
            attributes: attributes
        }
        if(!description) delete dataObject.description;
        if(!attributes) delete dataObject.attributes;
        
        tempId = this.reportClient.startTestItem(dataObject, launchId,scenarioId).tempId;
        if(!tempId) throw new Error("Can't start step");
        return tempId;
    }

    static async finishStep(stepId: string, result: TestStepResult){
        if(!this.reportClient) throw new Error("Can't init report portal");
        const dataObject = {
            endTime: this.reportClient.helpers.now(),
            status: this.convertCucumberStatusToReportPortalStatus(result.status)
        }
        
        return await this.reportClient.finishTestItem(stepId,dataObject);
    }

    static async stepLogs(itemId: string, result : TestStepResult, imageBase64?: string, imageName?: string){
        if(!this.reportClient) throw new Error("Can't init report portal");
        if(!result) throw new Error("Result is not defined");

        if(this.convertCucumberStatusToReportPortalStatus(result.status) !== ReportStatuses.PASSED){  
            const dataObject ={
                message: this.stripAnsiCodes(result.message),
                level: 'ERROR',
                time: this.reportClient.helpers.now()
            }          
            if (imageName && imageBase64) {
                const attachment = {
                    name: imageName,
                    content: imageBase64,
                    type: 'image/png'
                };
                await this.reportClient.sendLog(itemId, dataObject, attachment);
            } else {
                await this.reportClient.sendLog(itemId, dataObject);
            }
        }
    }

    static async addLog(stepId: string, message: string, level: 'TRACE'|'DEBUG'|'INFO'|'WARN'|'ERROR'|'FATAL' = 'INFO', imageName?: string, imageBase64?: string ){
        if(!this.reportClient) throw new Error("Can't init report portal");
        const dataObject = {
            message: message,
            level: level,
            time: this.reportClient.helpers.now()
        }
        //check if name and data is empty
        if(!imageName || !imageBase64) return await this.reportClient.sendLog(stepId,dataObject);;

        const attachment = {
            name: imageName,
            data: imageBase64,
            type: 'image/*'
        }

        return await this.reportClient.sendLog(stepId,dataObject, attachment);
        
        
    }

    static megereLaunches(mergeLaunchesOptions: MergeLaunchesOptions){
        if(!this.reportClient) throw new Error("Can't init report portal");
        if(!mergeLaunchesOptions) throw new Error("Merge launches options is not defined");
        if(!mergeLaunchesOptions.name) throw new Error("Merge launches name is not defined");
        if(!mergeLaunchesOptions.mergeType) throw new Error("Merge launches merge type is not defined");
        
        const dataObject = {
            name: mergeLaunchesOptions.name,
            description: mergeLaunchesOptions.description,
            extendSuitesDescription: mergeLaunchesOptions.extendSuitesDescription,
            mergeType: mergeLaunchesOptions.mergeType
        }

        return this.reportClient.mergeLaunches(dataObject);
    }



    


    static convertCucumberStatusToReportPortalStatus(status: string): ReportStatuses{
        switch(status){
            case 'PASSED': return ReportStatuses.PASSED;
            case 'FAILED': return ReportStatuses.FAILED;
            case 'SKIPPED': return ReportStatuses.SKIPPED;
            case 'PENDING': return ReportStatuses.SKIPPED;
            case 'UNDEFINED': return ReportStatuses.SKIPPED;
            case 'AMBIGUOUS': return ReportStatuses.SKIPPED;
            case 'UNKNOWN': return ReportStatuses.SKIPPED;
            default: return ReportStatuses.SKIPPED;
        }
    }

    private static stripAnsiCodes(string : string|undefined): string {
        if(!string) throw new Error("String is not defined")
        const ansiRegex = new RegExp(
            "[\u001B\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))",
            "g"
        );
        return string.replace(ansiRegex, '');
    }


}

export default ReportPortal;