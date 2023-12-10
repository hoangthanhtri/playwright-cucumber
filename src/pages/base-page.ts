import {  Page } from 'playwright';

export class BasePage {
    constructor(protected page: Page|undefined) {
        if (!page) throw new Error('Page is not defined');
        this.page = page;
    }
}
