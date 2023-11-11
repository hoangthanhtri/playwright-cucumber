import { writeFileSync } from 'fs';
import { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import {  GenerateTypes,ParamTypes } from '../../types/enums';

export class MicroServicesGenerator {  

  static async generaterAll(baseUrl:string, serviceObj: { [serviceName: string]: string }, username: string, password: string){
    

      for(const serviceName in serviceObj){
          const serviceUrl = baseUrl + serviceObj[serviceName] ;

        
        // Encode username and password in base64
        const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
        try {
              const response = await fetch(serviceUrl,{method: 'GET', headers: { 'Authorization': `Basic ${base64Credentials}` }});
              if (!response.ok) {
                  console.error(`Failed to fetch OpenAPI spec from ${serviceUrl}: ${response.statusText}`);
                  continue;
              }
              const spec = await response.json() as OpenAPIV3.Document;
              this.generate(serviceName,spec);
          } catch (error) {
              console.error(`Error generating files for ${serviceUrl}:`, error);
          }
      }
  }

  private static generate(serviceName:string,spec: OpenAPIV3.Document) {  
    this.generateEnums(serviceName,spec);
    this.GenerateTypes(serviceName,spec);
    this.generateEndpoints(serviceName,spec);
}

  private static generateEndpoints(serviceName:string,spec: OpenAPIV3.Document) {
  
    let content = `import { request, APIResponse } from '@playwright/test';
import { Options } from '../../src/core/types/types';\n`
    if(fs.existsSync(`./generate-services/types/${serviceName}-types.ts`) ){
      content += `import * as Types from '../types/${serviceName}-types';\n`;
    }
    if(fs.existsSync(`./generate-services/enums/${serviceName}-enums.ts`) ){
      content += `import * as Enums from '../enums/${serviceName}-enums';\n\n`;
    }
  
    // Iterate over paths and generate methods
    for (const [path, item ] of Object.entries(spec.paths)) {   
      if(!item)  continue; 
      const methodName = this.convertPathToMethodName(path);
      content += ` export class ${methodName} {\n
private static baseUrl = process.env.BASE_URL;
private static context = request.newContext({ baseURL: this.baseUrl});\n\n`;
      for (const [method, operation] of Object.entries(item)) {
        if (!operation) continue;
        const operationObj = operation as OpenAPIV3.OperationObject;
        const parameters = operationObj.parameters as OpenAPIV3.ParameterObject[];
        const requestBody = operationObj.requestBody;
        const schemas = spec.components?.schemas as OpenAPIV3.SchemaObject;

        let bodyString = '';
        let pathParamsString = '' ;
        let queryParamString ='';
        if(parameters){
          if(!spec.components)continue;
          queryParamString = parameters.find(param => param.in === ParamTypes.query) ?
           `params : Types.${this.convertQueryParamsTypeName(path,method)}`: ''; 
          pathParamsString = parameters.find(param => param.in === ParamTypes.path) ? 
          this.getParams(GenerateTypes.endpoints,ParamTypes.path, operationObj, spec.components).join(', ') : '';       
        }

  
        if (requestBody && (requestBody as OpenAPIV3.RequestBodyObject).content) {
          const contentType = (requestBody as OpenAPIV3.RequestBodyObject).content['application/json'];
          if (contentType && contentType.schema) {
            const schema = contentType.schema;
            if ('$ref' in schema) {
              const refKey = schema.$ref.split('/').pop(); // Extracting last part of the $ref string
              const refTypeName =  _.camelCase(refKey!);
              bodyString = `body: Types.${refTypeName}`;
            }
          }
        }
        let requestString = pathParamsString
        ? `\`${path.replace(/\{([^}]+)\}/g, (match, p1) => '${' +  _.camelCase(p1) + '}')}\`,`
        : `'${path}',`;
    
        
        

        content += `   static async ${method} (${pathParamsString ? pathParamsString + ', ': ''}${queryParamString ?  queryParamString + ', ' : ''}${bodyString ? bodyString + ', ' : ''}token?: string) : Promise<APIResponse> {\n`;
        content += `      let options : Options = {\n`;
        content += `${queryParamString ? `        params: params,\n` : ''}`;
        content += `${bodyString ? '        data: body,\n' : ''}`;
        content += '      };\n';
        content += '      if(token) {\n';
        content += '        options = {\n';
        content += '          ...options,\n';
        content += '          headers: { Authorization: `Bearer ${token}` },\n';
        content += '        };\n';
        content += '      }\n';
        content += `      return await (await this.context).${method}(${requestString} options);\n`;
        content += `    };\n`;    
        
      }
      content += `  };\n`;
    }

    this.createFile('generate-services/endpoints',`${serviceName}-endpoints.ts`,content);
  }

  private static GenerateTypes(serviceName:string,spec: OpenAPIV3.Document) {
    if (!spec.components || !spec.components.schemas) return;
   
    let content = !fs.existsSync(`./generate-services/enums/${serviceName}-enums.ts`) ? '' : `import * as Enums from '../enums/${serviceName}-enums';\n`;
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
     //if(name.includes('response')||name.includes('Response')) continue;
      if('type'in schema){
        if(schema.type === 'object'){          
          const typeName = name.split('/').pop() ;
          if(!typeName) throw new Error('Type name is not defined');
          if(name.includes('response')||name.includes('Response'))
          content += `type ${ _.camelCase(typeName)} = {\n`;
          else content += `export type ${ _.camelCase(typeName)} = {\n`;
          if (schema.properties) {
            for (const [propertyName, property] of Object.entries(schema.properties)) {
              let propName =  propertyName.replace(/[\/.-]/g, '');
              const isNullable = 'nullable' in property && property.nullable === true ? '?' : '';
              if ('$ref' in property) {
                const ref = property.$ref.split('/').pop();
                if(!ref) throw new Error('Ref is not defined');
                const refName =  _.camelCase(ref);   
                if(!refName) throw new Error('Ref name is not defined');
                if(refName && 'enum' in (spec.components?.schemas[ref] as OpenAPIV3.SchemaObject)){                
                content += `  ${propName}${isNullable}: Enums.${refName};\n`;
                } else {                
                content += `  ${propName}${isNullable}: ${refName};\n`;
                }
            } else if ('type' in property) {
              if (property.type === 'array' && '$ref' in property.items) {
                const ref = property.items.$ref.split('/').pop();
                if(!ref) throw new Error('Ref is not defined');
                const refName = _.camelCase(ref);
                if( 'enum' in (spec.components?.schemas[ref] as OpenAPIV3.SchemaObject)){                  
                  content += `  ${propName}${isNullable}: Enums.${refName}[];\n`;
                } else {              
                  content += `  ${propName}${isNullable}: ${refName}[];\n`;
                }
              } else if (property.type === 'array' && property.items && 'type' in property.items) {
                const itemType = this.getType(property.items as OpenAPIV3.SchemaObject);
                content += `  ${propName}${isNullable}: ${itemType}[];\n`;
              } else{
                const itemType = this.getType(property as OpenAPIV3.SchemaObject);
                content += `  ${propName}${isNullable}: ${itemType};\n`;
              }
            } else {
              content += `  ${propName}${isNullable}: any;\n`;
            }
           }          
          }
          content += '}\n';
        }
      }    
    }

    for(const [path, item] of Object.entries(spec.paths)){
      if(!item) continue;
     
      for (const [method, operation] of Object.entries(item)) {
        if (!operation) continue;
        const operationObj = operation as OpenAPIV3.OperationObject;
        const parameters = operationObj.parameters as OpenAPIV3.ParameterObject[];
        const responses = operationObj.responses;
        if(responses) {
          for(const[responseCode, responseItem] of Object.entries(responses)){
            if(!responseItem) continue;
            
              const responseObj = responseItem as OpenAPIV3.ResponseObject;
              if(!responseObj.content) continue;
              const contentType = responseObj.content['application/json'];
              if(!contentType) continue;
              if(!contentType.schema) continue;
              const schema = contentType.schema;
              if(!schema) continue;
              if('$ref' in schema){
                const responsePathName = `${this.convertPathToMethodName('response'+path +method+responseCode)}` ;
                const refKey = schema.$ref.split('/').pop();
                const refName = _.camelCase(refKey!);
                content += `export type ${responsePathName} = ${refName};\n`;
              }            
          }          
        }
        
        if(parameters && parameters.find(param => param.in === ParamTypes.query) ){
          content += `export type ${ this.convertQueryParamsTypeName(path,method)} = {\n`;
          content += this.getParams(GenerateTypes.types,ParamTypes.query, operationObj, spec.components).map(param => `  ${param}`).join(',\n');
          content += '\n}\n';
        } 

      }
      
    }

    this.createFile('generate-services/types',`${serviceName}-types.ts`,content);
  }
      
  private static generateEnums(serviceName:string,spec: OpenAPIV3.Document) {
    if (!spec.components || !spec.components.schemas) return;
    let content = '';
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      if('enum'in schema){
        
        const enumName = name.split('/').pop();
        if(!enumName) throw new Error('Enum name is not defined');
        content += `export enum ${_.camelCase(enumName)} {\n`;
        //enum values
        if (schema.enum) {
          schema.enum.forEach((value: any) => {
            content += `enum${value}= ${value},\n`;
          });
        }
        content += '}\n';
      }
    }
    //check if content is empty
    if(content === '') return;
    this.createFile('generate-services/enums',`${serviceName}-enums.ts`,content);
  }

  private static getType(schema: OpenAPIV3.SchemaObject): string {
    switch (schema.type) {
        case 'integer': return 'number';
        case 'number': return 'number';
        case 'string': 
          if (schema.format === 'date') return 'Date';
          if (schema.format === 'date-time') return 'Date';
          return 'string';
        case 'boolean': return 'boolean';
        default: 
          return 'any';
      }
  }

  private static convertQueryParamsTypeName(path: string, method: string): string{
    return `${this.convertPathToMethodName(path)}${_.upperFirst(method.toLowerCase())}Params`;
  }

  private static convertPathToMethodName(path: string): string {
    const versionMatch = path.match(/\/(v\d+)\//);
    const version = versionMatch ? versionMatch[1] : 'Unknown';
    const newPath = path.replace(/\/api\/v\d+\//, '');
    
    const parameterizedPath = newPath.replace(/\/{([^}]+)}/g, (match, p1) => `By${_.camelCase(p1)}`);

    const methodname = _.camelCase(parameterizedPath)+ `${_.upperFirst(version)}`;

    return methodname;
  }

  
  private static getParams (generateType: GenerateTypes,paramtype : ParamTypes, operationObj: OpenAPIV3.OperationObject,componentSchemas : OpenAPIV3.ComponentsObject) : string[] {
    const newArr : string[] = [];
    const parameters = operationObj.parameters;
    if (parameters && parameters.length) {
      parameters.forEach((item) => {
        const param = item as OpenAPIV3.ParameterObject;
        const required = param.required && param.required === true ? '' : '?';
        if ('schema' in param && param.schema && param.in === paramtype) {
          const schema = param.schema;
          let paramName : string;
          if(paramtype === ParamTypes.query){
            paramName = param.name.replace(/[\/.-]/g, '');
          } else{
            paramName = _.camelCase(param.name);
          }
          
          if ('$ref' in schema) {
              const refKey = schema.$ref.split('/').pop(); // Extracting last part of the $ref string
              const refName = _.camelCase(refKey!);
              const refPrefix =  (refKey && componentSchemas && componentSchemas.schemas && 'enum' in componentSchemas.schemas[refKey] ) ? 'Enums.' :  generateType === GenerateTypes.endpoints ? 'Types.' : '';
              if(required) newArr.push(`${paramName}${required}: ${refPrefix}${refName}`);
              else newArr.unshift(`${paramName}: ${refPrefix}${refName}`);
          } else if (schema.type === 'array') {
            if ('$ref' in schema.items) {
              const refKey = schema.items.$ref.split('/').pop(); // Extracting last part of the $ref string
              const refEnumName = _.camelCase(refKey!);
              if(required) newArr.push(`${paramName}${required}: Enums.${refEnumName}[]`);
              else newArr.push(`${paramName}: Enums.${refEnumName}[]`);
            } else{
              if(required) newArr.push(`${paramName}${required}: ${this.getType(schema.items as OpenAPIV3.SchemaObject)}[]`);
              else newArr.push(`${paramName}: ${this.getType(schema.items as OpenAPIV3.SchemaObject)}[]`);
            }
              
          } else {
            if(required) newArr.push(`${paramName}${required}: ${this.getType(schema)}`);
            else newArr.push(`${paramName}: ${this.getType(schema)}`);
          }        
        }
        
      });
    }
    return _.uniq(newArr);
  };


  private static createFolderIfNotExists(folderPath: string): void {
    if (!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath, { recursive: true });
    }
  }

  private static createFile(folderPath: string, fileName: string, content: string): void {
      this.createFolderIfNotExists(folderPath);
      fs.writeFileSync(path.join(folderPath, fileName), content);
  }
}

export default MicroServicesGenerator;