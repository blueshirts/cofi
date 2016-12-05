const ROOT = require('app-root-path').path;
const _ = require('underscore');
const {should, sinon} = require(`${ROOT}/test/test-env`);

const settings = require(`${ROOT}/lib/common/settings`);
const cofi_api = require(`${ROOT}/lib/cofi/cofi-api`);

describe('cofi-api-tests', function() {
  this.timeout(5000);
  let common_args = null;

  before(function() {
    // Obtain a token for the test.
    return cofi_api.login(settings.user, settings.pass).then( result => {
      // Ensure the common args are valid.
      should.exist(result.uid);
      should.exist(result.token);
      should.exist(result['api-token']);

      common_args = result;
    });
  });

  describe('#get_accounts()', function() {
    it('should retrieve accounts', function() {
      return cofi_api.get_accounts(common_args).then( accounts => {
        // Ensure accounts are returned.
        should.exist(accounts);
        Array.isArray(accounts).should.be.true;
        accounts.length.should.be.greaterThan(0);
      });
    });
  });

  describe('#get_all_transactions()', function() {
    it('should retrieve all transactions', function() {
      return cofi_api.get_all_transactions(common_args).then( transactions => {
        // Ensure transactions are returned.
        should.exist(transactions);
        Array.isArray(transactions).should.be.true;
        transactions.length.should.be.greaterThan(0);
      });
    });
  });

  describe('#get_monthly_averages()', function() {
    afterEach(function() {
      if (cofi_api.get_all_transactions.restore) {
        // Restore the stub.
        cofi_api.get_all_transactions.restore();
      }
    });

    it('should handle null transactions', function() {
      // Stub the get_all_transactions to return null.
      sinon.stub(cofi_api, 'get_all_transactions').returns(Promise.resolve());

      return cofi_api.get_monthly_averages(common_args).then( results => {
        // There should be a single key in the result.
        should_be_valid_monthly_result(results, 1);
      });
    });
    it('should handle empty transactions', function() {
      // Stub the get_all_transactions to return empty.
      sinon.stub(cofi_api, 'get_all_transactions').returns(Promise.resolve([]));

      return cofi_api.get_monthly_averages(common_args).then( results => {
        // There should be a single key in the result.
        should_be_valid_monthly_result(results, 1);
      });
    });
    it('should calculate monthly averages from all transactions', function() {
      return cofi_api.get_monthly_averages(common_args).then( results => {
        should_be_valid_monthly_result(results);
        _.keys(results).length.should.be.greaterThan(0);
      });
    });
    it('should ignore donut transactions', function() {
      // Stub the get_all_transactions to a donut transaction.
      const transactions = [
        {
          "amount": -111200,
          "transaction-id": "1453195740000",
          "merchant": "Krispy Kreme Donuts",
          "transaction-time": "2016-01-18T00:00:00.000Z"
        },
        {
          "amount": -76400,
          "transaction-id": "1453214340000",
          "merchant": "Dunkin #336784",
          "transaction-time": "2016-01-19T00:00:00.000Z"
        }
      ];
      sinon.stub(cofi_api, 'get_all_transactions').returns(Promise.resolve(transactions));

      return cofi_api.get_monthly_averages(common_args, {ignore_donuts: true}).then( results => {
        // There should only be a single ke since the transactions are donut related.
        should_be_valid_monthly_result(results, 1);
      });
    });
    it('should ignore cc transactions', function() {
      const transactions = [
        {
          "amount": -1000,
          "transaction-id": "1453195740001",
          "merchant": "CC Payment",
          "transaction-time": "2016-01-18T00:00:00.000Z"
        },
        {
          'amount': 1200,
          'transaction-id': '1453214340002',
          'merchant': 'Some Other Credit',
          'transaction-time': '2016-01-18T12:00:00.000Z'
        },
        {
          'amount': 1000,
          'transaction-id': '1453214340003',
          'merchant': 'CC Credit',
          'transaction-time': '2016-01-19T00:00:00.000Z'
        }
      ];

      sinon.stub(cofi_api, 'get_all_transactions').returns(Promise.resolve(transactions));

      return cofi_api.get_monthly_averages(common_args, {ignore_cc_payments: true}).then( results => {
        // There should be three keys in the result, the month, averages, and ignored.
        should_be_valid_monthly_result(results, 3);
      });
    });
    it('should ignore cc transactions in the entire result', function() {
      return cofi_api.get_monthly_averages(common_args, {ignore_cc_payments: true}).then( results => {
        should_be_valid_monthly_result(results);
      });
    });
  });
});

/**
 * Assert the monthly averages result.
 */
function should_be_valid_monthly_result(results, key_count = null) {
  // The results should exist.
  should.exist(results, '"results" should exist');
  // The results should be an object.
  _.isObject(results).should.be.true;
  // The results should contain an average.
  should.exist(results.average, '"average" key should exist');
  if (key_count) {
    // Validate the key count.
    _.keys(results).length.should.equal(key_count);
  }
}

