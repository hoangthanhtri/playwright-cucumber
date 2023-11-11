import getEnv from "../../helper/env/env";
import { MicroServicesGenerator } from "./micro-services-generator";
import * as _ from 'lodash';

export class GeneratorRunner{
    private static env_vars = [
        'PRODUCT_SERVICES_SWAGGER_JSON_PATH',
        'ORDER_SERVICES_SWAGGER_JSON_PATH',
        'IDENTITY_SERVICES_SWAGGER_JSON_PATH',
        'MARKETING_SERVICES_SWAGGER_JSON_PATH',
        'NOTIFIER_SERVICES_SWAGGER_JSON_PATH',
        'SEARCH_SERVICES_SWAGGER_JSON_PATH',
        'USER_SERVICES_SWAGGER_JSON_PATH',
        'UPLOADER_SERVICES_SWAGGER_JSON_PATH',
    ];

    private static async generateAll(){
        getEnv();
        const baseUrl = process.env.BASE_URL;
        const username = process.env.SWAGGER_USERNAME;
        const password = process.env.SWAGGER_PASSWORD;
        console.log(username,password,baseUrl)
        // convert service name and paths to service object
        const serviceObject: Record<string, string> = {};
        if(!username) throw new Error('Username is not defined');
        if(!password) throw new Error('Password is not defined');
        if(!baseUrl) throw new Error('Base url is not defined');
        if(!serviceObject) throw new Error('Service object is not defined');
        this.env_vars.forEach((env_var) => {
            const key : string = env_var.replace('_SWAGGER_JSON_PATH', '').replace('_','-').toLowerCase();
            const value = process.env[env_var];
            if(value === undefined ) throw new Error('Value is not defined');
            if(key === "" ) throw new Error('Key is not defined');
            else serviceObject[key] = value ;
        });
        
        await MicroServicesGenerator.generaterAll(baseUrl,serviceObject,username,password);          
    }

    static async run(){
        await this.generateAll().catch(err => {
            console.error(err);
            process.exit(1);
        });;
    }
}

export default GeneratorRunner.run();