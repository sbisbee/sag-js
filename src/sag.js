(function(exports) {
  var isArray = Array.isArray || function(arg) {
    return Object.prototype.toString.call(arg) == '[object Array]';
  }

  exports.server = function(host, port, user, pass) {
    var http;
    var xmlHTTP;

    var urlUtils;

    var decodeJSON = true;
    var currDatabase;
    var staleDefault = false;
    var globalCookies = {};

    function throwIfNoCurrDB() {
      if(!currDatabase) {
        throw 'Must setDatabase() first.';
      }
    }

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

      if(typeof callback === 'function') {
        callback(resp);
      }
    }

    function procPacket(method, path, data, headers, callback) {
      var cookieStr = '';

      headers = headers || {};

      if(!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      if(data && typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      //deal with global cookies
      for(var key in globalCookies) {
        if(globalCookies.hasOwnProperty(key)) {
          cookieStr += key + '=' + globalCookies[key] + ';';
        }
      }

      if(cookieStr) {
        headers.Cookie = ((headers.Cookie) ? headers.Cookie : '') + cookieStr;
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

    function setURLParameter(url, key, value) {
      if(typeof url !== 'string') {
        throw 'URLs must be a string';
      }

      if(urlUtils) {
        //node.js
        url = urlUtils.parse(url);

        url.search = ((url.search) ? url.search + '&' : '?')
                      + key + '=' + value;

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

    var publicThat = {
      get: function(opts) {
        throwIfNoCurrDB();

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

        if(staleDefault) {
          opts.url = setURLParameter(opts.url, 'stale', 'ok');
        }

        procPacket(
          'GET',
          '/' + currDatabase + opts.url,
          null,
          null,
          opts.callback
        );
      },

      post: function(opts) {
        var path;

        throwIfNoCurrDB();

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
        procPacket('GET', '/_all_dbs', null, null, callback);
      },

      getStats: function(callback) {
        if(!currDatabase) {
          throw 'Must setDatabase() first.';
        }

        procPacket('GET', '/_stats', null, null, callback);
      },

      generateIDs: function(opts) {
        var url = '/_uuids';

        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        if(typeof opts.count === 'number') {
          url += '?count=' + opts.count;
        }
        else if(typeof opts.count !== 'undefined') {
          throw 'Invalid count type';
        }

        procPacket('GET', url, null, null, opts.callback);
      },

      put: function(opts) {
        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        throwIfNoCurrDB();

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback';
        }

        if(!opts.id) {
          throw 'Must specify an id.';
        }

        if(typeof opts.id !== 'string') {
          throw 'Invalid id type (must be a string).';
        }

        if(!opts.data) {
          throw 'Invalid data: must specify data (a document) to PUT.';
        }
        else {
          if(!opts.data._id) {
            throw 'No _id specified in the data.';
          }

          if(typeof opts.data._id !== 'string') {
            throw 'Invalid _id specific (must be a string).';
          }

          if(typeof opts.data === 'object' || isArray(opts.data)) {
            opts.data = JSON.stringify(opts.data);
          }
          else if(typeof opts.data !== 'string') {
            throw 'Invalid data: must be a string of JSON or an object or array to be encoded as JSON.';
          }
        }

        procPacket(
          'PUT',
          '/' + currDatabase + '/' + opts.id,
          opts.data,
          null,
          opts.callback
        );
      },

      delete: function(id, rev, callback) {
        throwIfNoCurrDB();

        if(!id || typeof id !== 'string') {
          throw 'Invalid id';
        }

        if(!rev || typeof rev !== 'string') {
          throw 'Invalid rev';
        }

        if(callback && typeof callback !== 'function') {
          throw 'Invalid callback type';
        }

        procPacket(
          'DELETE',
          '/' + currDatabase + '/' + id,
          null,
          { 'If-Match': rev },
          callback
        );
      },

      head: function(opts) {
        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        throwIfNoCurrDB();

        if(typeof opts.url !== 'string' || !opts.url) {
          throw 'Invalid URL provided';
        }

        if(opts.url.substr(0, 1) !== '/') {
          opts.url = '/' + opts.url;
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type';
        }

        procPacket(
          'HEAD',
          '/' + currDatabase + opts.url,
          null,
          null,
          opts.callback
        );
      },

      getSession: function(callback) {
        if(callback && typeof callback !== 'function') {
          throw 'Invalid callback type';
        }

        procPacket('GET', '/_session', null, null, callback);
      },

      bulk: function(opts) {
        var data = {};

        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        throwIfNoCurrDB();

        if(!opts.docs || !isArray(opts.docs)) {
          throw 'Invalid docs provided.';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type';
        }

        if(opts.allOrNothing) {
          data.all_or_nothing = !!opts.allOrNothing;
        }

        data.docs = opts.docs;

        procPacket(
          'POST',
          '/' + currDatabase + '/_bulk_docs',
          data,
          null,
          opts.callback
        );
      },

      compact: function(opts) {
        var url;

        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        throwIfNoCurrDB();

        url = '/' + currDatabase + '/_compact';

        if(opts.viewName) {
          if(typeof opts.viewName !== 'string') {
            throw 'Invalid viewName provided.';
          }

          url += '/' + opts.viewName;
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type.';
        }

        procPacket('POST', url, null, null, opts.callback);
      },

      copy: function(opts) {
        if(typeof opts !== 'object') {
          throw 'Missing required opts.';
        }

        throwIfNoCurrDB();

        if(!opts.srcID || typeof opts.srcID !== 'string') {
          throw 'Invalid srcID.';
        }

        if(!opts.dstID || typeof opts.dstID !== 'string') {
          throw 'Invalid dstID.';
        }

        if(opts.dstRev) {
          if(typeof opts.dstRev !== 'string') {
            throw 'Invalid dstRev.';
          }

          opts.dstID += '?rev=' + opts.dstRev;
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type.';
        }

        procPacket(
          'COPY',
          '/' + currDatabase + '/' + opts.srcID,
          null,
          { Destination: opts.dstID },
          opts.callback
        );
      },

      setStaleDefault: function(isIt) {
        staleDefault = !!isIt;

        return publicThat;
      },

      createDatabase: function(name, callback) {
        if(!name || typeof name !== 'string') {
          throw 'Invalid database name.';
        }

        if(callback && typeof callback !== 'function') {
          throw 'Invalid callback type.';
        }

        procPacket('PUT', '/' + name, null, null, callback);
      },

      deleteDatabase: function(name, callback) {
        if(!name || typeof name !== 'string') {
          throw 'Invalid database name.';
        }

        if(callback && typeof callback !== 'function') {
          throw 'Invalid callback type.';
        }

        procPacket('DELETE', '/' + name, null, null, callback);
      },

      setAttachment: function(opts) {
        var url;

        throwIfNoCurrDB();

        if(!opts.name || typeof opts.name !== 'string') {
          throw 'Invalid attachment name.';
        }

        if(!opts.data || typeof opts.data !== 'string') {
          throw 'Invalid attachment data - remember to serialize it to a string!';
        }

        if(!opts.contentType || typeof opts.contentType !== 'string') {
          throw 'Invalid contentType.';
        }

        if(!opts.docID || typeof opts.docID !== 'string') {
          throw 'Invalid docID.';
        }

        if(opts.rev && typeof opts.rev !== 'string') {
          throw 'Invalid attachment revID.';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type.';
        }

        url = '/' + currDatabase + '/' + opts.docID + '/' + opts.name;

        if(opts.revID) {
          url += '?rev=' + opts.revID;
        }

        procPacket(
          'PUT',
          url,
          opts.data,
          { 'Content-Type': opts.contentType },
          opts.callback
        );
      },

      setCookie: function(key, value) {
        if(!key || typeof key !== 'string') {
          throw 'Invalid cookie key.';
        }

        if(value !== null && typeof value !== 'string') {
          throw 'Invalid non-string and non-null cookie value.';
        }

        if(value === null) {
          delete globalCookies[key];
        }
        else {
          globalCookies[key] = value;
        }

        return publicThat;
      },

      getCookie: function(key) {
        if(!key || typeof key !== 'string') {
          throw 'Invalid cookie key.';
        }

        return globalCookies[key];
      }
    };

    return publicThat;
  };
})((typeof exports === 'object') ? exports : (this.sag = {}));
