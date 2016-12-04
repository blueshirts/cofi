const ROOT = require('app-root-path').path;
const {should} = require(`${ROOT}/test/test-env`);

const settings = require(`${ROOT}/lib/common/settings`);
const cofi_api = require(`${ROOT}/lib/cofi/cofi-api`);

describe('cofi-api-tests', () => {
  let common_args = null;

  before( () => {
    // Obtain a token for the test.
    return cofi_api.login(settings.user, settings.pass).then( (result) => {
      // Ensure the common args are valid.
      should.exist(result.uid);
      should.exist(result.token);
      should.exist(result['api-token']);

      common_args = result;
    });
  });

  describe('#get_accounts()', () => {
    it('should retrieve accounts', () => {
      return cofi_api.get_accounts(common_args).then( accounts => {
        // Ensure accounts are returned.
        should.exist(accounts);
        Array.isArray(accounts).should.be.true;
        accounts.length.should.be.greaterThan(0);
      });
    });
  });

  describe('#get_all_transactions()', () => {
    it('should retrieve all transactions', () => {
      return cofi_api.get_all_transactions(common_args).then( transactions => {
        // Ensure transactions are returned.
        should.exist(transactions);
        Array.isArray(transactions).should.be.true;
        transactions.length.should.be.greaterThan(0);
      });
    });
  });

  describe('#get_monthly_averages()', () => {
    it('should calculate monthly averages', () => {
      return cofi_api.get_monthly_averages(common_args).then( results => {
        should.exist(results);
      });
    });
  });
});

