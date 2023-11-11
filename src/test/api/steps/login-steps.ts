import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Logger } from 'winston';


  Given('I am on the login page', async  function () {
    return expect(true).toBe(false);
  });

  When('I enter valid credentials', async function () {

    return expect(true).toBe(false);
  });

  When('I enter invalid credentials', async function () {


    return expect(true).toBe(false);
  });


  Then('I should be logged in', async function () {


    return expect(true).toBe(true);
  });

  Then('I should be failed', async function () {
  
      return expect(true).toBe(false);
    });

  Given('I am on the 111 page', async function () {
    return expect(true).toBe(false);
  });

