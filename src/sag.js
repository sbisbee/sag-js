(function(exports) {
  var isArray = Array.isArray || function(arg) {
    return Object.prototype.toString.call(arg) == '[object Array]';
  };

  //auth types
  exports.AUTH_BASIC = 'AUTH_BASIC';
  exports.AUTH_COOKIE = 'AUTH_COOKIE';

  //the meat
  exports.server = function(host, port, user, pass) {
    var http;
    var xmlHTTP;

    var urlUtils;

    var decodeJSON = true;
    var currDatabase;
    var staleDefault = false;
    var globalCookies = {};
    var pathPrefix = '';
    var currAuth = {};

    host = host || 'localhost';
    port = port || '5984';

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

    function toBase64(str) {
      if(typeof Buffer === 'function') {
        return new Buffer(str).toString('base64');
      }

      if(typeof btoa === 'function') {
        return btoa(str);
      }

      throw 'No base64 encoder available.';
    }

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

        for(var i in headers['set-cookie']) {
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
        if(xmlHTTP && console && typeof console.log === 'function') {
          console.log('Sending Cookie header, but do not expect any cookies in the result - CouchDB uses httpOnly cookies.');
        }

        headers.Cookie = ((headers.Cookie) ? headers.Cookie : '') + cookieStr;
      }

      if(pathPrefix) {
        path = pathPrefix + path;
      }

      if(currAuth.type === exports.AUTH_BASIC && (currAuth.user || currAuth.pass)) {
        headers['Authorization'] = 'Basic ' + toBase64(currAuth.user + ':' + currAuth.pass);
      }
      else if(currAuth.type === exports.AUTH_COOKIE) {
        if(http && typeof publicThat.getCookie('AuthSession') !== 'string') {
          throw 'Trying to use cookie auth, but we never got an AuthSession cookie from the server.';
        }

        headers['X-CouchDB-WWW-Authenticate'] = 'Cookie';
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

        if(opts.url) {
          if(typeof opts.url !== 'string') {
            throw 'Invalid url type (must be a string).';
          }

          if(opts.url.substr(0, 1) !== '/') {
            path += '/';
          }

          path += opts.url;
        }

        procPacket('POST', path, opts.data, null, opts.callback);
      },

      decode: function(d) {
        decodeJSON = !! d;
        return publicThat;
      },

      setDatabase: function(db, createIfNotFound, createCallback) {
        if(typeof db !== 'string' || db.length <= 0) {
          throw 'invalid database name';
        }

        if(createCallback) {
          if(!createIfNotFound) {
            throw 'Provided a callback but told not to check if the database exists.';
          }

          if(typeof createCallback !== 'function') {
            throw 'Invalid callback type.';
          }

          procPacket('GET', '/' + db, null, null, function(resp) {
            if(resp._HTTP.status === 404) {
              //create the db
              publicThat.createDatabase(db, function(resp) {
                //can't rely on resp.body.ok because decode might be false
                createCallback((resp._HTTP.status === 201));
              });
            }
            else if(resp._HTTP.status < 400) {
              //db was created
              createCallback(true);
            }
            else {
              //unexpected response
              createCallback(false);
            }
          });
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
        throwIfNoCurrDB();

        if(typeof callback !== 'function') {
          throw 'Invalid callback.';
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

        return publicThat;
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

        return publicThat;
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

        if(opts.docRev && typeof opts.docRev !== 'string') {
          throw 'Invalid attachment docRev.';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type.';
        }

        url = '/' + currDatabase + '/' + opts.docID + '/' + opts.name;

        if(opts.docRev) {
          url += '?rev=' + opts.docRev;
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
      },

      replicate: function(opts) {
        var data = {};

        if(typeof opts !== 'object') {
          throw 'Invalid parameter.';
        }

        if(!opts.source || typeof opts.source !== 'string') {
          throw 'Invalid source.';
        }

        if(!opts.target || typeof opts.target !== 'string') {
          throw 'Invalid target';
        }

        if(opts.filter && typeof opts.filter !== 'string') {
          throw 'Invalid filter.';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback type.';
        }

        if(opts.filterQueryParams) {
          if(typeof opts.filterQueryParams !== 'object') {
            throw 'Invalid filterQueryParams.';
          }

          if(!opts.filter) {
            throw 'Provided filterQueryParams but no filter.';
          }
        }

        data.source = opts.source;
        data.target = opts.target;

        if(opts.continuous) {
          data.continuous = !!opts.continuous;
        }

        if(opts.createTarget) {
          data.create_target = !!opts.createTarget;
        }

        if(opts.filter) {
          data.filter = opts.filter;

          if(opts.filterQueryParams) {
            data.filterQueryParams = opts.filterQueryParams;
          }
        }

        procPacket('POST', '/_replicate', data, null, opts.callback);
      },

      getAllDocs: function(opts) {
        var url;
        var qry = [];

        if(typeof opts !== 'object') {
          throw 'Invalid parameter.';
        }

        if(opts.includeDocs) {
          qry.push('include_docs=true');
        }

        if(opts.limit) {
          if(typeof opts.limit !== 'number') {
            throw 'Invalid limit.';
          }

          qry.push('limit=' + opts.limit);
        }

        if(opts.startKey) {
          if(typeof opts.startKey !== 'string') {
            throw 'Invalid startKey.';
          }

          qry.push('startkey=' + encodeURIComponent(opts.startKey));
        }

        if(opts.endKey) {
          if(typeof opts.endKey !== 'string') {
            throw 'Invalid endKey.';
          }

          qry.push('endkey=' + encodeURIComponent(opts.endKey));
        }

        if(opts.descending) {
          qry.push('descending=true');
        }

        qry = '?' + qry.join('&');

        url = '/' + currDatabase + '/_all_docs' + qry;

        if(opts.keys) {
          if(!isArray(opts.keys)) {
            throw 'Invalid keys (not an array).';
          }

          procPacket('POST', url, { keys: opts.keys }, null, opts.callback);
        }

        procPacket('GET', url, null, null, opts.callback);
      },

      setPathPrefix: function(pre) {
        if(pre !== undefined && pre !== null && typeof pre !== 'string') {
          throw 'Invalid path prefix.';
        }

        //no trailing slash
        if(pre.substr(pre.length - 1, 1) == '/') {
          pre = pre.substr(0, pre.length - 1);
        }

        pathPrefix = pre || '';

        return publicThat;
      },

      login: function(opts) {
        if(typeof opts !== 'object') {
          throw 'Invalid options object.';
        }

        if(opts.callback && typeof opts.callback !== 'function') {
          throw 'Invalid callback.';
        }

        if(opts.user && typeof opts.user !== 'string') {
          throw 'Invalid user.';
        }

        if(opts.pass && typeof opts.pass !== 'string') {
          throw 'Invalid pass.';
        }

        if(opts.type && typeof opts.type !== 'string') {
          throw 'Invalid type of auth - use AUTH_BASIC or AUTH_COOKIE.';
        }

        if(!opts.type || opts.type === exports.AUTH_BASIC) {
          currAuth.type = exports.AUTH_BASIC;
          currAuth.user = opts.user;
          currAuth.pass = opts.pass;

          if(opts.callback) {
            opts.callback(publicThat);
          }
          else {
            return publicThat;
          }
        }
        else if(opts.type === exports.AUTH_COOKIE) {
          //TODO url encode
          procPacket(
            'POST',
            '/_session',
            'name=' + opts.user + '&password=' + opts.pass,
            {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            function(resp) {
              if(resp.cookies && resp.cookies.AuthSession) {
                publicThat.setCookie(
                  'AuthSession',
                  resp.cookies.AuthSession
                );

                currAuth.type = opts.type;
              }

              if(opts.callback) {
                opts.callback(publicThat);
              }
            }
          );

          if(!opts.callback) {
            return publicThat;
          }
        }
        else {
          throw 'Unknown auth type.';
        }
      }
    };

    return publicThat;
  };
})((typeof exports === 'object') ? exports : (this.sag = {}));
