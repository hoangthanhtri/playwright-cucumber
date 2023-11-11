
Feature: Login user
    Scenario: Login with valid credentials
        Given I am on the login page
        When I enter valid credentials
        Then I should be logged in

    Scenario: Login with valid credentials 1
        Given I am on the 111 page
        When I enter invalid credentials
        Then I should be failed

    
