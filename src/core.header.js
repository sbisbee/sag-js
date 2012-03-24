(function(exports) {
  var isArray = Array.isArray || function(arg) {
    return Object.prototype.toString.call(arg) == '[object Array]';
  };

  var parseURL;

  if(typeof require === 'function') {
    parseURL = require('url').parse;
  }
  else {
    parseURL = function(str) {
      var res;
      var a = document.createElement('a');
      a.href = str;

      res = {
        protocol: a.protocol,
        port: a.port || '80',
        hostname: a.hostname,
        path: a.pathname
      };

      res.host = a.host || res.hostname + ':' + res.port;

      if(a.href.indexOf('@')) {
        res.auth = a.href.substr(
          res.protocol.length + 2,
          a.href.indexOf('@') - res.protocol.length - 2
        );
      }

      return res;
    };
  }

  //auth types
  exports.AUTH_BASIC = 'AUTH_BASIC';
  exports.AUTH_COOKIE = 'AUTH_COOKIE';
