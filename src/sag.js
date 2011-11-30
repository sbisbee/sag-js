(function(exports) {
  exports.server = function(host, port, user, pass) {
    var http;
    var xmlHTTP;

    if(typeof XMLHttpRequest === 'function') {
      xmlHTTP = new XMLHttpRequest();
    }
    else if(typeof ActiveXObject === 'function') {
      xmlHTTP = new ActiveXObject('Microsoft.XMLHTTP');
    }
    else if(typeof require === 'function') {
      http = require('http');
    }
    else {
      throw 'whoops';
    }

    function onResponse(httpCode, headers, body, callback) {
      callback({
        _HTTP: {
          status: httpCode
        },
        headers: headers,
        body: (typeof body === 'string' && body.length > 0) ? JSON.parse(body) : null
      });
    }

    function procPacket(method, path, data, headers, callback) {
      headers = headers || {};

      if(!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      if(http) {
        // Node.JS http module
        http.request(
          {
            host: host,
            port: port,
            url: path,
            headers: headers
          },
          function(res) {
            var resBody = '';

            res.on('data', function(chunk) {
              resBody += chunk;
            });

            res.on('end', function() {
              onResponse(res.statusCode, res.headers, resBody, callback);
            });
          }
        ).end();
      }
      else if(xmlHTTP) {
        // browser xhr
        xmlHTTP.onreadystatechange = function() {
          if(this.readyState === 4 && this.status > 0) {
            onResponse(this.status, {}, this.response, callback);
          }
        };

        xmlHTTP.open(method, 'http://' + host + ':' + port + path);

        for(var k in headers) {
          if(headers.hasOwnProperty(k)) {
            xmlHTTP.setRequestHeader(k, headers[k]);
          }
        }

        xmlHTTP.send();
      }
      else {
        throw 'coder fail';
      }
    }

    return {
      get: function(url, callback) {
        if(typeof url !== 'string') {
          throw 'invalid url type';
        }

        if(url.substr(0, 1) !== '/') {
          url = '/' + url;
        }

        procPacket('GET', url, null, null, callback);
      }
    };
  };
})((typeof exports === 'object') ? exports : (this.sag = {}));
