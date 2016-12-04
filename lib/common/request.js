/**
 * Simple library to make JSON requests.
 */
const ROOT = require('app-root-path').path;
const _ = require('underscore');
const Promise = require('bluebird');
const request_lib = require('request');

// Use a default request instance.
request = request_lib.defaults({
  json: true
});

// Debug flag.
const verbose = false;

// Valid HTTP response codes for our example.
const VALID_RESPONSE_CODES = new Set([200]);

// Valid error codes.
const VALID_ERROR_CODES = new Set(['no-error']);


/**
 * Make a request.
 * @param options {Object} options - the request options.
 * @return {Promise} return a Promise of the response body.
 */
const invoke = (options = null) => {
  return new Promise( (resolve, reject) => {
    if (verbose) {
      console.log(`Invoking ${options.method} ${options.url}`);
      console.dir(options);
    }

    request(options, (err, response, body) => {
      if (err) {
        return reject(err);
      }
      else if (VALID_RESPONSE_CODES.has(response.statusCode) === false) {
        // The response code is not valid.
        return reject(`Invalid response code: ${response.statusCode} for url: ${options.url}`);
      }
      else if (!body || !body.error) {
        // The body is not valid.
        return reject('Body is not valid');
      }
      else if (VALID_ERROR_CODES.has(body.error) == false) {
        // The error code is not valid.
        return reject(`Invalid error code: ${body.error}`);
      }

      return resolve(body);
    });
  });
};

/**
 * Utility to make a get request.
 */
const get = Promise.method( (url, options = null) => {
  return invoke(_.extend({url:url, method: 'GET'}, options));
});

/**
 * Utility to make a post request.
 */
const post = Promise.method( (url, options = null) => {
  return invoke(_.extend({url: url, method: 'POST'}, options));
});


// Exports.
exports.invoke = invoke;
exports.get = get;
exports.post = post;
