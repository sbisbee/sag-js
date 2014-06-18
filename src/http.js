var http;
var useSSL;

// Common interface for http[s] modules to send responses to.
var onResponse = function(httpCode, headers, body, callback, decodeJSON) {
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

module.exports.init = function(host, port, useSSL) {
  var http = (useSSL) ? require('https') : require('http');
  var decodeJSON = true;

  // The common interface for the API functions to cause a net call.
  return {
    decodeJSON: function(decode) {
      decodeJSON = !!decode;
    },

    procPacket: function(method, path, data, headers, callback) {
      var procData = function(res) {
        var resBody = '';

        res.setEncoding('utf8');

        res.on('data', function(chunk) {
          resBody += chunk;
        });

        res.on('end', function() {
          onResponse(res.statusCode, res.headers, resBody, callback, decodeJSON);
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
    }
  };
};
