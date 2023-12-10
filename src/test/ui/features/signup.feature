Feature: signup account
# @signup
# Scenario Outline: signup account with invalid data
#     Given I am on the signup page
#     When I fill in Email with <email>
#     Then I should see <error_message>

#         Examples:
#             | email          | error_message |
#             | abc            | Invalid email |
#             | xyz            | valid email   |
#             | abc            | Invalid email |
#             | abc            | Invalid email |


Scenario: signup account with valid data
    Given I am on the signup page
    Then I fill in Email with "abc@gmail.com"

    