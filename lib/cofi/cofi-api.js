const assert = require('assert');
const ROOT = require('app-root-path').path;
const Promise = require('bluebird');
const moment = require('moment');

const settings = require(`${ROOT}/lib/common/settings`);
const request = require(`${ROOT}/lib/common/request`);

const BASE = settings.url;
const LOGIN_URL = `${BASE}/login`;
const ALL_TRANSACTIONS_URL = `${BASE}/get-all-transactions`;
const ACCOUNTS_URL = `${BASE}/get-accounts`;


/**
 * Log a user in and retrieve a fresh token.
 */
const login = Promise.method((user, pass, api_token = null) => {
  assert(user, '"user" is required');
  assert(pass, '"pass" is required');
  if (!api_token) {
    // Use the default application token.
    api_token = settings.token
  }
  // POST to the login url.
  return request.post(LOGIN_URL, {
    body: {
      email: user,
      password: pass,
      args: {
        'api-token': api_token
      }
    }
  }).then( result => {
    // Return the common args.
    return Promise.resolve({
      uid: result.uid,
      token: result.token,
      'api-token': api_token
    });
  });
});

/**
 * Retrieve the users accounts.
 */
const get_accounts = Promise.method( common_args => {
  return request.post(ACCOUNTS_URL, {
    body: {
      args: common_args
    }
  }).then( results => {
    // Return only the accounts.
    return Promise.resolve(results.accounts);
  });
});

/**
 * Load all of a users transactions.
 */
const get_all_transactions = Promise.method( common_args => {
  return request.post(ALL_TRANSACTIONS_URL, {
    body: {
      args: common_args
    }
  }).then (results => {
    // Return the transactions.
    return Promise.resolve(results.transactions);
  });
});

/**
 *
 */
const get_key = (year, month) => {
  // Prevent accidentally swapping params.
  assert(year > 12, '"year" is invalid.');
  assert(month > 0 && month <= 12, '"month" is invalid');
  return `${year}-${month < 10 ? '0' + month : month}`;
}

/**
 * Retrieve the monthly averages for all transactions.
 */
const get_monthly_averages = Promise.method( common_args => {
  return get_all_transactions(common_args).then( transactions => {
    // Iterate over the transactions.
    // Keep track of the total spending and income for all months found.
    // Keep track of the earliest year.
    // Keep track of the earliest month for that year.
    // Keep track of the total months for calculating the final average.
    //
    // From the earliest year/month to the latest year/month output the averages in
    // time order by year and month.
    //
    // Sum the averages for each month while outputing
    //
    // Output the average of all months.

    // TODO: Ensure to test for zero input.
    // TODO: Validate date input syntax and print failed transactions.

    // Keep track of the earliest and latest year/months so you can sort the result.
    let earliest_year = Number.MAX_VALUE;
    let latest_year = Number.MIN_VALUE;

    // Keep track of the monthly averages.
    let month_to_averages = new Map();

    // Iterate over all transactions.
    for (let i = 0; i < transactions.length; i++) {
      let t = transactions[i];
      let transaction_date = moment.utc(t['transaction-time']);
      let year = transaction_date.year();
      let month = transaction_date.month() + 1;

      if (year <= earliest_year) {
        earliest_year = Math.min(earliest_year, year);
      }
      if (year >= latest_year) {
        latest_year = Math.max(latest_year, year);
      }

      let key = get_key(year, month); // Key of the year/month combo.
      if (!month_to_averages.has(key)) {
        // Initialize the month.
        month_to_averages.set(key, {
          spent: 0,
          income: 0
        });
      }

      // Update the month.
      let sign = Math.sign(t.amount);
      if (sign === 1) {
        // The transaction is a credit.
        month_to_averages.get(key).income += t.amount;
      }
      else {
        // The transaction is a debit.
        month_to_averages.get(key).spent += Math.abs(t.amount);
      }
    }

    // The input data is sorted to this code is probably not needed. It ensures
    // that they keys are added to the result in date order.
    let result = {};
    let total_spent = 0, total_income = 0;
    for (let year = earliest_year; year <= latest_year; year++) {
      for (let month = 1; month <= 12; month++) {
        let key = get_key(year, month);
        if (month_to_averages.has(key)) {
          let month_data = month_to_averages.get(key);
          total_spent += month_data.spent;
          total_income += month_data.income;
          result[key] = month_data;
        }
      }
    }

    result['average'] = {
      spent: Math.round(total_spent / month_to_averages.size),
      income: Math.round(total_income / month_to_averages.size)
    }

    return Promise.resolve(result);
  });
});


// Exports.
exports.login = login;
exports.get_accounts = get_accounts;
exports.get_all_transactions = get_all_transactions;
exports.get_monthly_averages = get_monthly_averages;
