const ROOT = require('app-root-path').path;
const {should} = require(`${ROOT}/test/test-env`);


describe('settings-tests', () => {
  it('should load and return settings', () => {
    let settings = require(`${ROOT}/lib/common/settings`);
    should.exist(settings);
    should.exist(settings.url);
    should.exist(settings.user);
    should.exist(settings.pass);
  });
});
