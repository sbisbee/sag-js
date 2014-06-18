var http;
var useSSL;

var toBase64 = function(str) {
  return new Buffer(str).toString('base64');
}

// Common interface for http[s] modules to send responses to.
var onResponse = function(httpCode, headers, body, callback) {
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

  if(typeof callback === 'function') {
    callback(resp, (resp._HTTP.status < 400));
  }
};

// Triggers a change of HTTP engine.
module.exports.useSSL = function(ssl) {
  ssl = !!ssl;

  //includes initial state when useSSL === undefined
  if(ssl !== useSSL) {
    useSSL = ssl;
    http = (ssl) ? require('https') : require('http');
  }
};

// The common interface for the API functions to cause a net call.
module.exports.procPacket = function(method, path, data, headers, callback) {
  var procData = function(res) {
    var resBody = '';

    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      resBody += chunk;
    });

    res.on('end', function() {
      onResponse(res.statusCode, res.headers, resBody, callback);
    });
  };

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
  if(currAuth.type === module.exports.AUTH_BASIC && (currAuth.user || currAuth.pass)) {
    headers.Authorization = 'Basic ' + toBase64(currAuth.user + ':' + currAuth.pass);
  }
  else if(currAuth.type === module.exports.AUTH_COOKIE && typeof publicThat.getCookie('AuthSession') !== 'string') {
    throw new Error('Trying to use cookie auth, but we never got an AuthSession cookie from the server.');
  }

  //TODO define in build tool's postproc
  headers['User-Agent'] = 'Sag-JS/0.4';

  req = http.request({
    method: method,
    host: host,
    port: port,
    path: path,
    headers: headers
  }, procData);

  req.on('error', function(e) {
    throw e;
  });

  if(data) {
    req.write(data);
  }

  req.end();
};
