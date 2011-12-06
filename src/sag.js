(function(exports) {
  exports.server = function(host, port, user, pass) {
    var http;
    var xmlHTTP;

    var decodeJSON = true;

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
      var resp = {
        _HTTP: {
          status: httpCode
        },
        headers: headers
      };

      if(typeof body === 'string') {
        resp.body = (body.length > 0 && decodeJSON) ? JSON.parse(body) : body;
      }

      callback(resp);
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
        // Browser xhr magik
        xmlHTTP.onreadystatechange = function() {
          if(this.readyState === 4 && this.status > 0) {
            var headers = {};
            var rawHeaders = this.getAllResponseHeaders().split('\n');

            for(var i in rawHeaders) {
              rawHeaders[i] = rawHeaders[i].split(': ');

              if(rawHeaders[i][1]) {
                headers[rawHeaders[i][0]] = rawHeaders[i][1];
              }
            }

            onResponse(this.status, headers, this.response, callback);
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

    var publicThat = {
      get: function(opts) {
        if(typeof opts !== 'object') {
          throw 'invalid opts object';
        }

        if(typeof opts.url !== 'string') {
          throw 'invalid url type';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'invalid callback type';
        }

        if(opts.url.substr(0, 1) !== '/') {
          opts.url = '/' + opts.url;
        }

        procPacket('GET', opts.url, null, null, opts.callback);
      },
      decode: function(d) {
        decodeJSON = !! d;
        return publicThat;
      }
    };

    return publicThat;
  };
})((typeof exports === 'object') ? exports : (this.sag = {}));
