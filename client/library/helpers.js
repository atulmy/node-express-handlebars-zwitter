'use strict';

let moment = require('moment');

exports.not = function (v) {
  return v.toUpperCase();
};

exports.niceTime = function (t) {
  return moment(t).fromNow();
};