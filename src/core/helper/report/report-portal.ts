import {  ReportAttributes, ReportResponse, ReportPortalConnection } from '../../types/types';
import { ReportStatuses } from '../../types/enums';
import { GherkinDocument, Pickle, PickleStep, TestStepResult} from '@cucumber/messages'
//@ts-ignore
const RPClient = require('@reportportal/client-javascript');

export class  ReportPortal{

    private static reportClient: typeof RPClient | undefined; // Instance variable to store RPClient

   static async reportInit(launchName: string,reportConnection: ReportPortalConnection ,attributes?: ReportAttributes[], mode: 'DEFAULT'|'DEBUG' ='DEFAULT', tempId?: string,description?: string){
        this.reportClient = await new RPClient(reportConnection);
        if(!this.reportClient) throw new Error("Can't init report portal");
        await this.reportClient.checkConnect().then(() => {
            console.log('Connected to ReportPortal');
        }).catch(() => {
            console.error('Error connecting to ReportPortal');
        });

        const launchData = {
            name: launchName,
            startTime: this.reportClient.helpers.now(),
            description: description,
            attributes: attributes,
            id: tempId,
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

    static async stepLogs(itemId: string, result : TestStepResult){
        if(!this.reportClient) throw new Error("Can't init report portal");
        if(!result) throw new Error("Result is not defined");
        if(this.convertCucumberStatusToReportPortalStatus(result.status) !== ReportStatuses.PASSED){
            
            await this.reportClient.sendLog(itemId, {
                message: result.message,
                level: 'ERROR',
                time: this.reportClient.helpers.now()
            });
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


}

export default ReportPortal;