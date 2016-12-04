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
        should.exist(results);
        _.isObject(results).should.be.true;
        // There should be a single key in the result.
        _.keys(results).length.should.equal(1);
        // The key should be the average.
        should.exist(results['average']);
      });
    });
    it('should handle empty transactions', function() {
      // Stub the get_all_transactions to return empty.
      sinon.stub(cofi_api, 'get_all_transactions').returns(Promise.resolve([]));

      return cofi_api.get_monthly_averages(common_args).then( results => {
        should.exist(results);
        _.isObject(results).should.be.true;
        // There should be a single key in the result.
        _.keys(results).length.should.equal(1);
        // The key should be the average.
        should.exist(results['average']);
      });
    });
    it('should calculate monthly averages', function() {
      return cofi_api.get_monthly_averages(common_args).then( results => {
        should.exist(results);
        _.isObject(results);
        _.keys(results).length.should.be.greaterThan(0);
      });
    });
  });
});

