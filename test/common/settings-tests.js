const ROOT = require('app-root-path').path;
const {should} = require(`${ROOT}/test/test-env`);


describe('settings-tests', () => {
  it('should load and return settings', () => {
    let settings = require(`${ROOT}/lib/common/settings`);
    should.exist(settings);
    should.exist(settings.api_url);
    should.exist(settings.api_user);
    should.exist(settings.api_pass);
  });
});
