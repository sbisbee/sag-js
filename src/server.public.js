publicThat = {
  get: function(opts) {
    throwIfNoCurrDB();

    if(typeof opts !== 'object') {
      throw new Error('invalid opts object');
    }

    if(typeof opts.url !== 'string') {
      throw new Error('invalid url type');
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('invalid callback type');
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
      throw new Error('invalid opts object');
    }

    if(opts.data === null || opts.data === undefined) {
      throw new Error('you must specify data to POST');
    }

    path = '/' + currDatabase;

    if(opts.url) {
      if(typeof opts.url !== 'string') {
        throw new Error('Invalid url type (must be a string).');
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
      throw new Error('invalid database name');
    }

    if(createCallback) {
      if(!createIfNotFound) {
        throw new Error('Provided a callback but told not to check if the database exists.');
      }

      if(typeof createCallback !== 'function') {
        throw new Error('Invalid callback type.');
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
      throw new Error('Invalid callback.');
    }

    procPacket('GET', '/_stats', null, null, callback);
  },

  generateIDs: function(opts) {
    var url = '/_uuids';

    if(typeof opts !== 'object') {
      throw new Error('Missing required opts.');
    }

    if(typeof opts.count === 'number') {
      url += '?count=' + opts.count;
    }
    else if(typeof opts.count !== 'undefined') {
      throw new Error('Invalid count type');
    }

    procPacket('GET', url, null, null, opts.callback);
  },

  put: function(opts) {
    if(typeof opts !== 'object') {
      throw new Error('Missing required opts.');
    }

    throwIfNoCurrDB();

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback');
    }

    if(!opts.id) {
      throw new Error('Must specify an id.');
    }

    if(typeof opts.id !== 'string') {
      throw new Error('Invalid id type (must be a string).');
    }

    if(!opts.data) {
      throw new Error('Invalid data: must specify data (a document) to PUT.');
    }
    else {
      if(!opts.data._id) {
        throw new Error('No _id specified in the data.');
      }

      if(typeof opts.data._id !== 'string') {
        throw new Error('Invalid _id specific (must be a string).');
      }

      if(typeof opts.data === 'object' || isArray(opts.data)) {
        opts.data = JSON.stringify(opts.data);
      }
      else if(typeof opts.data !== 'string') {
        throw new Error('Invalid data: must be a string of JSON or an object or array to be encoded as JSON.');
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
      throw new Error('Invalid id');
    }

    if(!rev || typeof rev !== 'string') {
      throw new Error('Invalid rev');
    }

    if(callback && typeof callback !== 'function') {
      throw new Error('Invalid callback type');
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
      throw new Error('Missing required opts.');
    }

    throwIfNoCurrDB();

    if(typeof opts.url !== 'string' || !opts.url) {
      throw new Error('Invalid URL provided');
    }

    if(opts.url.substr(0, 1) !== '/') {
      opts.url = '/' + opts.url;
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type');
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
      throw new Error('Invalid callback type');
    }

    procPacket('GET', '/_session', null, null, callback);
  },

  bulk: function(opts) {
    var data = {};

    if(typeof opts !== 'object') {
      throw new Error('Missing required opts.');
    }

    throwIfNoCurrDB();

    if(!opts.docs || !isArray(opts.docs)) {
      throw new Error('Invalid docs provided.');
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type');
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
      throw new Error('Missing required opts.');
    }

    throwIfNoCurrDB();

    url = '/' + currDatabase + '/_compact';

    if(opts.viewName) {
      if(typeof opts.viewName !== 'string') {
        throw new Error('Invalid viewName provided.');
      }

      url += '/' + opts.viewName;
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type.');
    }

    procPacket('POST', url, null, null, opts.callback);
  },

  copy: function(opts) {
    if(typeof opts !== 'object') {
      throw new Error('Missing required opts.');
    }

    throwIfNoCurrDB();

    if(!opts.srcID || typeof opts.srcID !== 'string') {
      throw new Error('Invalid srcID.');
    }

    if(!opts.dstID || typeof opts.dstID !== 'string') {
      throw new Error('Invalid dstID.');
    }

    if(opts.dstRev) {
      if(typeof opts.dstRev !== 'string') {
        throw new Error('Invalid dstRev.');
      }

      opts.dstID += '?rev=' + opts.dstRev;
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type.');
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
      throw new Error('Invalid database name.');
    }

    if(callback && typeof callback !== 'function') {
      throw new Error('Invalid callback type.');
    }

    procPacket('PUT', '/' + name, null, null, callback);
  },

  deleteDatabase: function(name, callback) {
    if(!name || typeof name !== 'string') {
      throw new Error('Invalid database name.');
    }

    if(callback && typeof callback !== 'function') {
      throw new Error('Invalid callback type.');
    }

    procPacket('DELETE', '/' + name, null, null, callback);
  },

  setAttachment: function(opts) {
    var url;

    throwIfNoCurrDB();

    if(!opts.name || typeof opts.name !== 'string') {
      throw new Error('Invalid attachment name.');
    }

    if(!opts.data || typeof opts.data !== 'string') {
      throw new Error('Invalid attachment data - remember to serialize it to a string!');
    }

    if(!opts.contentType || typeof opts.contentType !== 'string') {
      throw new Error('Invalid contentType.');
    }

    if(!opts.docID || typeof opts.docID !== 'string') {
      throw new Error('Invalid docID.');
    }

    if(opts.docRev && typeof opts.docRev !== 'string') {
      throw new Error('Invalid attachment docRev.');
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type.');
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
      throw new Error('Invalid cookie key.');
    }

    if(value !== null && typeof value !== 'string') {
      throw new Error('Invalid non-string and non-null cookie value.');
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
      throw new Error('Invalid cookie key.');
    }

    return globalCookies[key];
  },

  replicate: function(opts) {
    var data = {};

    if(typeof opts !== 'object') {
      throw new Error('Invalid parameter.');
    }

    if(!opts.source || typeof opts.source !== 'string') {
      throw new Error('Invalid source.');
    }

    if(!opts.target || typeof opts.target !== 'string') {
      throw new Error('Invalid target');
    }

    if(opts.filter && typeof opts.filter !== 'string') {
      throw new Error('Invalid filter.');
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback type.');
    }

    if(opts.filterQueryParams) {
      if(typeof opts.filterQueryParams !== 'object') {
        throw new Error('Invalid filterQueryParams.');
      }

      if(!opts.filter) {
        throw new Error('Provided filterQueryParams but no filter.');
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
      throw new Error('Invalid parameter.');
    }

    if(opts.includeDocs) {
      qry.push('include_docs=true');
    }

    if(opts.limit) {
      if(typeof opts.limit !== 'number') {
        throw new Error('Invalid limit.');
      }

      qry.push('limit=' + opts.limit);
    }

    if(opts.startKey) {
      if(typeof opts.startKey !== 'string') {
        throw new Error('Invalid startKey.');
      }

      qry.push('startkey=' + encodeURIComponent(opts.startKey));
    }

    if(opts.endKey) {
      if(typeof opts.endKey !== 'string') {
        throw new Error('Invalid endKey.');
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
        throw new Error('Invalid keys (not an array).');
      }

      procPacket('POST', url, { keys: opts.keys }, null, opts.callback);
    }

    procPacket('GET', url, null, null, opts.callback);
  },

  setPathPrefix: function(pre) {
    if(pre !== undefined && pre !== null && typeof pre !== 'string') {
      throw new Error('Invalid path prefix.');
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
      throw new Error('Invalid options object.');
    }

    if(opts.callback && typeof opts.callback !== 'function') {
      throw new Error('Invalid callback.');
    }

    if(opts.user && typeof opts.user !== 'string') {
      throw new Error('Invalid user.');
    }

    if(opts.pass && typeof opts.pass !== 'string') {
      throw new Error('Invalid pass.');
    }

    if(opts.type && typeof opts.type !== 'string') {
      throw new Error('Invalid type of auth - use AUTH_BASIC or AUTH_COOKIE.');
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
      throw new Error('Unknown auth type.');
    }
  },

  on: function(flag, callback) {
    if(observers[flag]) {
      observers[flag].push(callback);
    }
    else {
      throw new Error('Invalid event name.');
    }

    return publicThat;
  },

  toString: function() {
    var str = 'http://';

    if(currAuth && currAuth.user) {
      str += currAuth.user + ':' + (currAuth.pass || '') + '@';
    }

    str += host;

    if(port) {
      str += ':' + port;
    }

    if(currDatabase) {
      str += '/' + currDatabase;
    }

    return str;
  }
};

return publicThat;
};
