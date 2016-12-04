const fs = require('fs');
const ROOT = require('app-root-path').path;

// The settings file path.
const SETTINGS_FILE = ('/conf/settings.json');

let stats;
try {
  // The settings file content.
  settings = require(`${ROOT}/${SETTINGS_FILE}`);
  module.exports = settings;
}
catch (e) {
  // Error loading settings.
  throw new Error(`Unable to load settings (${SETTINGS_FILE}): ${e}`);
}

