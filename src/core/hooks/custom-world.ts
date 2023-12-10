import { IWorld, World, setWorldConstructor } from "@cucumber/cucumber";
import { Page, Browser } from "playwright";

export class CustomWorld extends World{
    page: Page | undefined;
    browser: Browser | undefined;
    constructor({attach, log, parameters}:IWorld) {
        super({attach, log, parameters});
    }
}

setWorldConstructor(CustomWorld);