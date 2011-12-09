(function(exports) {
  exports.server = function(host, port, user, pass) {
    var http;
    var xmlHTTP;

    var decodeJSON = true;
    var currDatabase;

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

      if(data && typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      if(http) {
        // Node.JS http module
        headers['User-Agent'] = 'Sag-JS/0.1'; //can't set this in browsers

        var req = http.request(
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

        xmlHTTP.send(data || null);
      }
      else {
        throw 'coder fail';
      }
    }

    var publicThat = {
      get: function(opts) {
        if(!currDatabase) {
          throw 'You must call setDatabase() first.';
        }

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

        procPacket('GET', '/' + currDatabase + opts.url, null, null, opts.callback);
      },

      post: function(opts) {
        var path;

        if(!currDatabase) {
          throw 'You must call setDatabase() first.';
        }

        if(typeof opts !== 'object') {
          throw 'invalid opts object';
        }

        if(opts.data === null || opts.data === undefined) {
          throw 'you must specify data to POST';
        }

        path = '/' + currDatabase;

        if(opts.path) {
          if(typeof opts.path !== 'string') {
            throw 'Invalid path type (must be a string).';
          }

          if(opts.path.substr(0, 1) !== '/') {
            path += '/';
          }

          path += opts.path;
        }

        procPacket('POST', path, opts.data, null, opts.callback);
      },

      decode: function(d) {
        decodeJSON = !! d;
        return publicThat;
      },

      setDatabase: function(db) {
        if(typeof db !== 'string' || db.length <= 0) {
          throw 'invalid database name';
        }

        currDatabase = db;

        return publicThat;
      },

      currentDatabase: function() {
        return currDatabase;
      },

      getAllDatabases: function(callback) {
        procPacket('GET', '/_all_dbs', null, null, function(res) {
          callback(res.body);
        });
      }
    };

    return publicThat;
  };
})((typeof exports === 'object') ? exports : (this.sag = {}));
