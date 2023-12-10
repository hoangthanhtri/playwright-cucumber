import { BasePage } from './base-page';

export class Login extends BasePage {

    async access() {
        await this.page?.goto('https://playwright.dev/');
    }

    async clickBtn() {
        await this.page?.click('button');
    }

    async getBtnText() {
        return await this.page?.textContent('button');
    }


}