exports.server = function(host, port, useSSL) {

// The API that server returns.
var publicThat;

var http = (useSSL) ? require('https') : require('http');
var urlUtils = require('url');

// Whether we should decode response bodies or not.
var decodeJSON = true;
// The current database.
var currDatabase;
// Whether ?stale=ok should be put into URLs by default or not.
var staleDefault = false;
// The cookies from setCookie() and getCookie()
var globalCookies = {};
// User supplied path prefix.
var pathPrefix = '';
// Stores the auth info: user, pass, type.
var currAuth = {};

// Used by sag.on()
var observers = {
  _notify: function(k, v) {
    var i;

    if(this[k]) {
      for(i in this[k]) {
        if(this[k].hasOwnProperty(i) && typeof this[k][i] === 'function') {
          this[k][i](v);
        }
      }
    }
  },
  error: []
};

// Utility function to remove a bunch of dupe code.
function throwIfNoCurrDB() {
  if(!currDatabase) {
    throw new Error('Must setDatabase() first.');
  }
}

// Because JS can't do base 64 on its own (wtf?)
function toBase64(str) {
  return new Buffer(str).toString('base64');
}

// Common interface for XHR and http[s] modules to send responses to.
function onResponse(httpCode, headers, body, callback) {
  var resp = {
    _HTTP: {
      status: httpCode
    },
    headers: headers
  };
  var i;
  var pieces;

  if(typeof body === 'string') {
    try {
      //JSON decode
      resp.body = (body.length > 0 && decodeJSON) ? JSON.parse(body) : body;
    }
    catch(e) {
      //failed to decode - likely not JSON
      resp.body = body;
    }
  }

  //will likely only happen in node due to httpOnly cookies
  if(headers['set-cookie']) {
    resp.cookies = {};

    for(i in headers['set-cookie']) {
      if(headers['set-cookie'].hasOwnProperty(i)) {
        pieces = headers['set-cookie'][i].split(';')[0].split('=');
        resp.cookies[pieces[0]] = pieces[1];
        pieces = null;
      }
    }
  }

  if(resp._HTTP.status >= 400) {
    observers._notify('error', resp);
  }

  if(typeof callback === 'function') {
    callback(resp, (resp._HTTP.status < 400));
  }
}

// The common interface for the API functions to cause a net call.
function procPacket(method, path, data, headers, callback) {
  var cookieStr = '';
  var i;
  var req;

  headers = headers || {};

  if(!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if(data && typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  //deal with global cookies
  for(i in globalCookies) {
    if(globalCookies.hasOwnProperty(i)) {
      cookieStr += i + '=' + globalCookies[i] + ';';
    }
  }

  //only when we built a cookieStr above
  if(cookieStr) {
    headers.Cookie = ((headers.Cookie) ? headers.Cookie : '') + cookieStr;
  }

  if(pathPrefix) {
    path = pathPrefix + path;
  }

  //authentication
  if(currAuth.type === exports.AUTH_BASIC && (currAuth.user || currAuth.pass)) {
    headers.Authorization = 'Basic ' + toBase64(currAuth.user + ':' + currAuth.pass);
  }
  else if(currAuth.type === exports.AUTH_COOKIE) {
    if(http && typeof publicThat.getCookie('AuthSession') !== 'string') {
      throw new Error('Trying to use cookie auth, but we never got an AuthSession cookie from the server.');
    }

    headers['X-CouchDB-WWW-Authenticate'] = 'Cookie';
  }

  // Node.JS http module
  headers['User-Agent'] = 'Sag-JS/0.4';

  req = http.request(
    {
      method: method,
      host: host,
      port: port,
      path: path,
      headers: headers
    },
    function(res) {
      var resBody = '';

      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        resBody += chunk;
      });

      res.on('end', function() {
        onResponse(res.statusCode, res.headers, resBody, callback);
      });
    }
  );

  req.on('error', function(e) {
    console.log('problem with request: ' + e);
  });

  if(data) {
    req.write(data);
  }

  req.end();
}

// Adds a query param to a URL.
function setURLParameter(url, key, value) {
  if(typeof url !== 'string') {
    throw new Error('URLs must be a string');
  }

  url = urlUtils.parse(url);

  url.search = ((url.search) ? url.search + '&' : '?') + key + '=' + value;

  url = urlUtils.format(url);

  return url;
}

//defaults
host = host || 'localhost';
port = port || '5984';
