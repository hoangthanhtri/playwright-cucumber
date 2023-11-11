# Getting start

## MyAutomation

This is a test framework built using Playwright, Cucumber, Report Portal.

## Features
- **Playwright & Cucumber**: Powers the core tests with a behavior-driven approach.

- **Report Portal**: Provides an intuitive dashboard for detailed test reporting.

- **Docker**: Report Portal.

## Development Environment

Before you begin, ensure that your system meets the following prerequisites:

- **IDE**: While VSCode is preferred, you can use any IDE of your choice.
- **NodeJS & npm**: Ensure that NodeJS and npm is installed and properly configured.
- **Playwright**: Ensure that Playwright is installed. [How to install Playwright](https://playwright.dev/docs/intro#installing-playwright)
- **Docker**: Needed to initialize Report Portal.

## Project Structure

The main components of the project structure are:

- `core`: where all Page Objects, Driver Factory, Utils located
- `test`: where all Features, Steps located

## Configuration

Before running the tests, ensure that the necessary configurations are set:

- `Docker-compose.yml`: where to init docker image
- `\src\core\helper\env`: where to store environment file

## Running 

1. initialize Report portal by the Docker images `docker-compose Docker-compose.yml up`
2. Run tests on npm scripts
