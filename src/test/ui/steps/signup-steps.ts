import { Given,Then,When, World } from "@cucumber/cucumber";
import { Login } from "../../../pages/login-page";
import { expect } from "@playwright/test";
import { CustomWorld } from "../../../core/hooks/custom-world";


Given('I am on the signup page', async function (this: CustomWorld) {
    const login = new Login(this.page);
    await login.access();



    
});

Then('I fill in Email with {}', async function (this: CustomWorld, email: string) {
    const login = new Login(this.page);
    await expect(await login.getBtnText()).toBe('Get started');


});

// Then('I should see {}', async function (errorMessage) {
//     console.log('I should see ' + errorMessage);
// });



