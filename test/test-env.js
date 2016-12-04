const assert = require('assert');
const chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();

assert(should, '"should" should exist');

exports.char;
exports.should = should;
