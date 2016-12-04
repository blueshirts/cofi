# COFI Example

Coding example using the level API.

## Requirements

- Node.js - This code example is intended to be run on the current stable version of
Node.js (v6.9.1).  The package can be downloaded at the following [location](https://nodejs.org/en/download/).

## Installation

1. Install Node.js using the required program installer (see requirements).
1. Install the dependencies:

    npm install

## Running Examples from the Command Line.

1. Retrieve the monthly transaction averages by running the following command.

    ./bin/run_monthly_averages.js -u interview@levelmoney.com -p password2

## Running the Test Cases.

1. Install mocha globally.

    sudo npm install -g mocha

1. Run the tests.

   mocha --recursive

