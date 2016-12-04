#!/usr/bin/env node

const ROOT = require('app-root-path').path;
const program = require('commander');

const pkg = require(`${ROOT}/package.json`);

const cofi_api = require(`${ROOT}/lib/cofi/cofi-api`);

// Process the environment.
program
  .version(pkg.version)
  .option('-u  --user <s>', 'Users email address')
  .option('-p  --pass <s>', 'Users password')
  .option('-d --ignore-donuts', 'Ignore donut related transactions.')
  .parse(process.argv);

if (!program.user || !program.pass) {
  console.log('"user" and "pass" are required options.  See help for more details.');
  process.exit(1);
}

// Obtain the common args.
cofi_api.login(program.user, program.pass).then( common_args => {
  const options = {
    ignore_donuts: program.ignoreDonuts
  };
  cofi_api.get_monthly_averages(common_args, options).then( results => {
    if (results) {
      console.log(JSON.stringify(results, null, 2));
    }
    else {
      console.log('Error: Invalid results.');
    }
  });
});

