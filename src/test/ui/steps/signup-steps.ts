import { Given,Then,When } from "@cucumber/cucumber";


Given('I am on the signup page', async function () {
    
});

When('I fill in Email with {}', async function (email) {
    console.log('I fill in Email with ' + email);

});

Then('I should see {}', async function (errorMessage) {
    console.log('I should see ' + errorMessage);
});



