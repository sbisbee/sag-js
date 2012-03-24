(function(exports) {
  var isArray = Array.isArray || function(arg) {
    return Object.prototype.toString.call(arg) == '[object Array]';
  };

  var parseURL;

  if(typeof require === 'function') {
    parseURL = require('url').parse;
  }
  else {
    console.log('bwah');
    throw Error('not implemented in browser yet');
  }

  //auth types
  exports.AUTH_BASIC = 'AUTH_BASIC';
  exports.AUTH_COOKIE = 'AUTH_COOKIE';
