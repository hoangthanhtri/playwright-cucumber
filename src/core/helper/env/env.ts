import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export const getEnv = () => {
    const { ENV } = process.env;
    
    if (!ENV) {
        console.error("ENV variable is not set. Unable to determine which .env file to load!");
        process.exit(1);
    }

    const envFilePath = path.resolve(__dirname, `../env/.env.${ENV.toLowerCase()}`);
    
    if (!fs.existsSync(envFilePath)) {
        console.error(`The .env file does not exist at path: ${envFilePath}`);
        process.exit(1);
    }

    dotenv.config({
        path: envFilePath
    });
}

export default getEnv;
