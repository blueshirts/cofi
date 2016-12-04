const assert = require('assert');
const ROOT = require('app-root-path').path;
const Promise = require('bluebird');
const moment = require('moment');

const settings = require(`${ROOT}/lib/common/settings`);
const request = require(`${ROOT}/lib/common/request`);

/**
 * The API urls.
 */
const BASE = settings.url;
const LOGIN_URL = `${BASE}/login`;
const ALL_TRANSACTIONS_URL = `${BASE}/get-all-transactions`;
const ACCOUNTS_URL = `${BASE}/get-accounts`;

/**
 * The locale language.
 */
const LANG = process.env.LANG.split[0];

/**
 * The locale currency formattting options.
 */
const LOCALE_OPTIONS = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
};

/**
 * Names of donut merchants.
 */
DONUT_MERCHANTS = new Set(['KRISPY KREME DONUTS', 'DUNKIN #336784']);


/**
 * Log a user in and retrieve a fresh token.
 */
module.exports.login = Promise.method((user, pass, api_token = null) => {
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
module.exports.get_accounts = Promise.method( common_args => {
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
module.exports.get_all_transactions = Promise.method( common_args => {
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
 * Retrieve the monthly averages for all transactions.
 * @param {Object} common_args - the common args.
 * @param {Object} options - the api options.
 *
 * The following options can be supplied.
 * - ignore_donuts - Flag whether to ignore donut transactions.
 */
module.exports.get_monthly_averages = Promise.method( (common_args, options = {}) => {
  const {ignore_donuts} = options;

  // Reference the module export so that it can be sutbbed in tests.
  return module.exports.get_all_transactions(common_args).then( transactions => {
    // TODO: Validate date input syntax and print failed transactions.

    if (!transactions || transactions.length == 0) {
      // Nothing to do, **EXIT**
      return Promise.resolve({
        average: {
          spent: 0,
          income: 0
        }
      });
    }

    // Keep track of the earliest and latest year/months so you can sort the result.
    let earliest_year = Number.MAX_VALUE;
    let latest_year = Number.MIN_VALUE;

    // Keep track of the monthly averages.
    let month_to_averages = new Map();

    // Iterate over all transactions.
    for (let i = 0; i < transactions.length; i++) {
      let t = transactions[i];

      if (ignore_donuts) {
        // Ignore donut related transactions, could possibly look at the raw merchant field also.
        if (DONUT_MERCHANTS.has(t.merchant.toUpperCase())) {
          // The transaction is donut related.
          continue; // **LOOP**
        }
      }

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
        // Initialize the month in the map.
        month_to_averages.set(key, {
          spent: 0,
          income: 0
        });
      }

      // Record the transaction for the corresponding year/month.
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

    // Calculate the averages for all months and ensure they keys are added to
    // the result in chronological order.
    let result = {};
    let total_spent = 0, total_income = 0; // Keep track of the totals for all months.

    // Iterate from the earliest year to the latest year. If there is data in out map
    // then add it to the result.
    for (let year = earliest_year; year <= latest_year; year++) {
      for (let month = 1; month <= 12; month++) {
        let key = get_key(year, month); // The key for the year/month combination.

        if (month_to_averages.has(key)) {
          // There is data for this month.
          let month_data = month_to_averages.get(key);
          // Update the totals with this months data.
          total_spent += month_data.spent;
          total_income += month_data.income;
          // Add to the result.
          result[key] = {
            spent: format_currency(month_data.spent),
            income: format_currency(month_data.income),
          }
        }
      }
    }

    // Add the average spending and income for all months to the result.
    result['average'] = {
      spent: format_currency(Math.round(total_spent / month_to_averages.size)),
      income: format_currency(Math.round(total_income / month_to_averages.size))
    }

    return Promise.resolve(result);
  });
});


// ---------- Utilities ----------

/**
 * Retrieve a key value from the year and month.
 * @param {Number} year - the key's year.
 * @param {Number} month - the key's month.
 * @return {String} a key in the format year-month, i.e. 2016-01
 */
const get_key = (year, month) => {
  // Prevent accidentally swapping params.
  assert(year > 12, '"year" is invalid.');
  assert(month > 0 && month <= 12, '"month" is invalid');
  return `${year}-${month < 10 ? '0' + month : month}`;
}

/**
 * Convert a number to a formatted currency string.
 * @param {Number} n - an integer value representing a currency.
 * @return {String} the number formatted as a locale specific currency.
 */
const format_currency = (n) => {
  if (!n || n == 0) {
    n = 0;
  }
  else {
    n /= 100;
  }
  return Number(n).toLocaleString(LANG, LOCALE_OPTIONS);
};
