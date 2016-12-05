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
 *
 * NOTE: For the purposes of this example I am assuming the transactions are coming
 *        back in date/time order. This seemed to be the case from what I can see. If
 *        this is not the case I'd most likely have to sort the input in order to
 *        implement certain options.
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
  const {ignore_donuts, ignore_cc_payments} = options;

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
    const month_to_averages = new Map();

    // Keep track of the last 24 hours of transactions.
    const last_days_transactions = [];

    // An object that keeps track of matching transactions to ignore.
    const next_transactions = new MatchingTransactionsStore({transactions: transactions});

    // Iterate over all transactions.
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const transaction_date = moment.utc(t['transaction-time']);
      const year = transaction_date.year();
      const month = transaction_date.month() + 1;

      if (ignore_donuts === true) {
        // Ignore donut related transactions, could possibly look at the raw
        // merchant field also.
        if (DONUT_MERCHANTS.has(t.merchant.toUpperCase())) {
          // The transaction is donut related.
          continue; // **LOOP**
        }
      }

      if (ignore_cc_payments === true) {
        if (next_transactions.is_ignored(t['transaction-id'])) {
          // The current transaction is a credit card payment, skip it.
          continue; // **LOOP**
        }
        next_transactions.process_current_index(i);
        if (next_transactions.is_ignored(t['transaction-id'])) {
          // The current transaction is a credit card payment, skip it.
          continue; // **LOOP**
        }
      }

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
    result.average = {
      spent: format_currency(Math.round(total_spent / month_to_averages.size)),
      income: format_currency(Math.round(total_income / month_to_averages.size))
    }

    if (ignore_cc_payments) {
      // Store the ignored credit card transactions in the result.
      result.ignored = Array.from(next_transactions.ignored_transactions.values());
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

/**
 * Class to keep track of the next days transactions.
 */
class MatchingTransactionsStore {
  /**
   * Constructor.
   */
  constructor(options = {}) {
    this.transactions = options.transactions; // A reference to the list of transactions.
    this.next_transactions = [];              // The running list of transactions 24 hours in advance.
    this.amount_to_transactions = new Map();  // Map of amounts to a list of related transactions.
    this.ignored_transactions = new Map();    // Map of ignored transaction ids to transactions.
  }
  /**
   * Update the future transaction set to only have transactions 24 hours into the future.
   * @param {Number} index - the index of the current transaction.
   */
  process_current_index(index) {
    // The current transaction.
    const current = this.transactions[index];
    const current_timestamp = moment.utc(current['transaction-time']);

    // Remove and transactions before the current transaction time.
    while (this.next_transactions.length > 0) {
      const t = this.next_transactions[0];
      if (t.timestamp.isBefore(current_timestamp)) {
        // The transaction is more than 24 hours in the past, it can be removed.
        this.next_transactions.shift();
        // TODO: Clean up.
        this.amount_to_transactions.get(t.transaction.amount).shift();
      }
      else {
        break;
      }
    }
    const a_day_from_now = current_timestamp.add(1, 'day');
    // Add any transactions within 24 hours of the current time.
    for (let i = index + this.next_transactions.length; i < this.transactions.length; i++) {
      const next_transaction = this.transactions[i];
      const next_timestamp = moment.utc(next_transaction['transaction-time']);

      if (next_timestamp.isAfter(a_day_from_now)) {
        // This date is too far into the future.
        break;
      }

      // The transaction is within the next 24 hours, add it.
      this.next_transactions.push({
        transaction: next_transaction,
        timestamp: next_timestamp
      });
      if (this.amount_to_transactions.has(next_transaction.amount) === false) {
        // Initialize the map for this key.
        this.amount_to_transactions.set(next_transaction.amount, []);
      }
      this.amount_to_transactions.get(next_transaction.amount).push(next_transaction);
    }

    const matches = this.amount_to_transactions.get(current.amount * -1);
    if (matches && matches.length > 0 && matches) {
      const future = matches[0];
      // Make sure were not matching on the same transaction. I believe this can happen in the
      // case of an amount that equals zero.
      if (current['transaction-id'] != future['transaction-id']) {
        this.ignored_transactions.set(current['transaction-id'], current);
        this.ignored_transactions.set(future['transaction-id'], future);
        //console.log(`Transaction ${current['transaction-id']} (${current['transaction-time']}) with amount ${current.amount}`);
        //console.log(`\tmatches future transaction ${future['transaction-id']} (${future['transaction-time']}) with amount: ${future.amount}`);
      }
    }
  }
  is_ignored(transaction_id) {
    return this.ignored_transactions.has(transaction_id);
  }
}
