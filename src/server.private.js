exports.server = function(host, port, user, pass) {

// The API that server returns.
var publicThat;

/*
 * http is the node module whereas xmlHTTP is the XHR object. Also a good
 * way to detect whether you're in node or browser land.
 */
var http;
var xmlHTTP;

// If in node land this is the url module.
var urlUtils;

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
// Stores the auth info: user, pass, type
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
  //node
  if(typeof Buffer === 'function') {
    return new Buffer(str).toString('base64');
  }

  //browser
  if(typeof btoa === 'function') {
    return btoa(str);
  }

  throw new Error('No base64 encoder available.');
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
    //debug help
    if(xmlHTTP && console && typeof console.log === 'function') {
      console.log('Sending Cookie header, but do not expect any cookies in the result - CouchDB uses httpOnly cookies.');
    }

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

  if(http) {
    // Node.JS http module
    headers['User-Agent'] = 'Sag-JS/0.1'; //can't set this in browsers

    req = http.request(
      {
        method: method,
        host: host,
        port: port,
        path: path,
        headers: headers
      },
      function(res) {
        var resBody;

        res.setEncoding('utf8');

        if(method !== 'HEAD') {
          resBody = '';

          res.on('data', function(chunk) {
            resBody += chunk;
          });
        }

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
  else if(xmlHTTP) {
    // Browser xhr magik
    xmlHTTP.onreadystatechange = function() {
      var headers = {};
      var rawHeaders;
      var i;

      if(this.readyState === 4 && this.status > 0) {
        rawHeaders = this.getAllResponseHeaders().split('\n');

        for(i in rawHeaders) {
          if(rawHeaders.hasOwnProperty(i)) {
            rawHeaders[i] = rawHeaders[i].split(': ');

            if(rawHeaders[i][1]) {
              headers[rawHeaders[i][0].toLowerCase()] = rawHeaders[i][1].trim();
            }
          }
        }

        onResponse(
          this.status,
          headers,
          (method !== 'HEAD') ? this.response : null,
          callback
        );
      }
    };

    xmlHTTP.open(method, 'http://' + host + ':' + port + path);

    for(i in headers) {
      if(headers.hasOwnProperty(i)) {
        xmlHTTP.setRequestHeader(i, headers[i]);
      }
    }

    xmlHTTP.send(data || null);
  }
  else {
    throw new Error('coder fail');
  }
}

// Adds a query param to a URL.
function setURLParameter(url, key, value) {
  if(typeof url !== 'string') {
    throw new Error('URLs must be a string');
  }

  if(urlUtils) {
    //node.js
    url = urlUtils.parse(url);

    url.search = ((url.search) ? url.search + '&' : '?') + key + '=' + value;

    url = urlUtils.format(url);
  }
  else {
    //browser
    url = url.split('?');

    url[1] = ((url[1]) ? url[1] + '&' : '') + key + '=' + value;

    url = url.join('?');
  }

  return url;
}

//defaults
host = host || 'localhost';
port = port || '5984';

//environment and http engine detection
if(typeof XMLHttpRequest === 'function') {
  xmlHTTP = new XMLHttpRequest();
}
else if(typeof ActiveXObject === 'function') {
  xmlHTTP = new ActiveXObject('Microsoft.XMLHTTP');
}
else if(typeof require === 'function') {
  http = require('http');
  urlUtils = require('url');
}
else {
  throw new Error('whoops');
}
