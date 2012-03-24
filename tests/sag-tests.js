var dbName = 'sag-js-tests';
var dbNameRepl = 'sag-js-tests-repl';

var isArray = Array.isArray || function(arg) {
  return Object.prototype.toString.call(arg) == '[object Array]';
};

function makeCouch(setDB, loginCallback) {
  var couch = sag.server('localhost', '80');

  couch.setPathPrefix('/db');

  if(loginCallback) {
    couch.login({
      user: 'admin',
      pass: 'passwd',
      type: sag.AUTH_COOKIE,
      callback: loginCallback
    });
  }

  if(setDB) {
    couch.setDatabase(dbName);
  }

  return couch;
}

module('Core');

test('setPathPrefix()', function() {
  var couch = makeCouch(false);

  expect(1);

  equal(couch, couch.setPathPrefix(''), 'got the api back');
});

test('Init', function() {
  var couch = makeCouch(false);
  expect(1);

  equal(typeof couch, 'object', 'server() should return an object');
});

test('setDatabase() and currentDatabase()', function() {
  var couch = makeCouch(false);

  expect(3);

  equal(couch.currentDatabase(), undefined, 'no db yet');

  equal(couch.setDatabase(dbName), couch, 'returns sag object');
  equal(couch.currentDatabase(), dbName, 'did it get set?');
});

test('cookies', function() {
  var couch = makeCouch(false);

  expect(3);

  equal(couch.setCookie('foo', 'bar'), couch, 'got the api back');

  equal(couch.getCookie('foo'), 'bar', 'set internally correctly');

  equal(couch.getCookie('a'), undefined, 'not set');
});

asyncTest('createDatabase()', function() {
  expect(2);

  makeCouch(false, function(couch) {
    couch.createDatabase(dbName, function(resp) {
      equal(resp.body.ok, true, 'JSON body/parsing check');
      equal(resp._HTTP.status, '201', 'Proper HTTP code');

      couch.deleteDatabase(dbName, function(r) {
        start();
      });
    });
  });
});

asyncTest('setDatabase() and create if does not exist', function() {
  expect(2);

  makeCouch(false, function(couch) {

    couch.setDatabase(dbName);

    couch.get({
      url: '/',
      callback: function(resp) {
        equal(resp._HTTP.status, 404, 'expect it to not be there');

        couch.setDatabase(dbName, true, function(exists) {
          ok(exists, 'db should exist now');

          start();
        });
      }
    });
  });
});

asyncTest('decode()', function() {
  expect(5);

  makeCouch(true, function(couch) {
    equal(couch.decode(false), couch, 'returns the sag obj');

    couch.get({
      url: '/',
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a response');
        equal(typeof resp.body, 'string', 'no decode');

        couch.decode(true);

        couch.get({
          url: '/',
          callback: function(resp) {
            equal(resp._HTTP.status, 200, 'got a response');
            equal(typeof resp.body, 'object', 'no decode');

            start();
          }
        });
      }
    });
  });
});

asyncTest('get()', function() {
  expect(2);

  makeCouch(true, function(couch) {
    couch.get({
      url: '',
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a 200');
        equal(typeof resp.body, 'object', 'body is decoded');

        start();
      }
    });
  });
});

asyncTest('put()', function() {
  var docID = 'wellhellothere';
  var docData = {
    _id: docID,
    how: 'you doin',
    worked: true
  };

  expect(4);

  makeCouch(true, function(couch) {
    couch.put({
      id: docID,
      data: docData,
      callback: function(resp) {
        equal(resp._HTTP.status, 201, 'got a 201');
        equal(resp.body.id, docID, 'got the id');

        docData._rev = resp.body.rev;

        couch.put({
          id: docID,
          data: docData,
          callback: function(resp) {
            equal(resp._HTTP.status, 201, 'got a 201');

            //for the next call and its deepEqual()
            docData._rev = resp.body.rev;

            couch.get({
              url: docID,
              callback: function(resp) {
                deepEqual(resp.body, docData, 'got the body');

                start();
              }
            });
          }
        });
      }
    });
  });
});

asyncTest('post()', function() {
  var docData = {
    foo: 'bar'
  };

  expect(2);

  makeCouch(true, function(couch) {
    couch.post({
      data: docData,
      callback: function(resp) {
        equal(resp._HTTP.status, 201, 'got a 201');

        //for the next call and deepEqual
        docData._id = resp.body.id;
        docData._rev = resp.body.rev;

        couch.get({
          url: resp.body.id,
          callback: function(resp) {
            deepEqual(resp.body, docData, 'data got saved');

            start();
          }
        });
      }
    }); 
  });
});

asyncTest('getAllDatabases()', function() {
  expect(3);

  makeCouch(true, function(couch) {
    couch.getAllDatabases(function(resp) {
      var hasOurDb = false;

      equal(resp._HTTP.status, 200, 'got a 200');
      ok(isArray(resp.body));

      for(var i in resp.body) {
        if(resp.body[i] === dbName) {
          hasOurDb = true;
          break;
        }
      }

      ok(hasOurDb, 'Our DB should be in the list.');

      start();
    });
  });
});

asyncTest('head()', function() {
  expect(2);

  makeCouch(true, function(couch) {
    couch.head({
      url: '/',
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a 200');
        strictEqual(resp.body, undefined, 'no body in resp object');

        start();
      }
    });
  });
});

asyncTest('post(), delete(), then head()', function() {
  expect(3);

  makeCouch(true, function(couch) {
    couch.post({
      data: {},
      callback: function(resp) {
        var id = resp.body.id;
        var rev = resp.body.rev;

        equal(
          couch.delete(id, rev, function(resp) {
            equal(resp._HTTP.status, 200, 'got a 200');

            couch.head({
              url: id,
              callback: function(resp) {
                equal(resp._HTTP.status, 404, 'got a 404 after delete()');

                start();
              }
            });
          }),
          couch,
          'Got the couch object back'
        );
      }
    });
  });
});

asyncTest('bulk()', function() {
  var docs = [
    {
      foo: 'bar',
      _id: 'one'
    },
    {
      hi: 'there',
      _id: 'two'
    }
  ];

  expect(2 + docs.length);

  makeCouch(true, function(couch) {
    couch.bulk({
      docs: docs,
      callback: function(resp) {
        var i;

        equal(resp._HTTP.status, 201, 'got a 201 back');
        equal(resp.body.length, docs.length, 'proper array size');

        for(i in resp.body) {
          if(resp.body.hasOwnProperty(i)) {
            equal(resp.body[i].id, docs[i]._id, 'matching _id');
          }
        }

        start();
      }
    });
  });
});

asyncTest('copy() to new doc', function() {
  expect(2);

  makeCouch(true, function(couch) {
    couch.copy({
      srcID: 'one',
      dstID: 'oneCopy',
      callback: function(resp) {
        equal(resp._HTTP.status, 201, 'got a 201 back');
        equal(resp.body.id, 'oneCopy', 'got the id back');

        start();
      }
    });
  });
});

asyncTest('copy() to overwrite', function() {
  expect(4);

  makeCouch(true, function(couch) {
    //overwrite 'two' with 'one'
    couch.get({
      url: 'two',
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a 200 back');
        ok(resp.body._id, 'has an _id');
        ok(resp.body._rev, 'has a _rev');

        couch.copy({
          srcID: 'one',
          dstID: resp.body._id,
          dstRev: resp.body._rev,
          callback: function(resp) {
            equal(resp._HTTP.status, 201, 'got a 201 back');

            start();
          }
        });
      }
    });
  });
});

asyncTest('setAttachment()', function() {
  var attachment = {
    name: 'lyrics',
    data: 'If I could turn back time...',
    cType: 'text/ascii'
  };

  makeCouch(true, function(couch) {
    couch.get({
      url: 'one',
      callback: function(resp) {
        var doc = {
          id: resp.body._id,
          rev: resp.body._rev
        };

        equal(resp._HTTP.status, 200, 'got a 200 back');

        couch.setAttachment({
          docID: doc.id,
          docRev: doc.rev,

          name: attachment.name,
          data: attachment.data,
          contentType: attachment.cType,

          callback: function(resp) {
            equal(resp._HTTP.status, 201, 'got a 201 back');

            couch.get({
              url: '/' + doc.id + '/' + attachment.name,
              callback: function(resp) {
                equal(resp._HTTP.status, 200, 'got a 200 back');
                equal(resp.body, attachment.data, 'proper data');
                equal(
                  resp.headers['content-type'],
                  attachment.cType,
                  'proper Content-Type header'
                );

                start();
              }
            });
          }
        });
      }
    });
  });
});

asyncTest('replicate()', function() {
  expect(2);

  makeCouch(false, function(couch) {
    couch.replicate({
      source: dbName,
      target: dbNameRepl,
      createTarget: true,
      continuous: false,
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a 200 back');
        ok(resp.body.ok, 'ok');

        couch.deleteDatabase(dbNameRepl);

        start();
      }
    });
  });
});

asyncTest('getAllDocs()', function() {
  expect(1);

  makeCouch(true, function(couch) {
    couch.getAllDocs({
      limit: 10,
      includeDocs: true,
      descending: true,
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got our 200');

        start();
      }
    });
  });
});

asyncTest('setStaleDefault() with view', function() {
  var url = '/_design/app/_view/count';
  var value;

  var ddoc = {
    _id: '_design/app',
    views: {
      count: {
        map: 'function(doc) { emit(null, 1); }',
        reduce: '_sum'
      }
    }
  };

  expect(7);

  makeCouch(true, function(couch) {
    //create the ddoc
    couch.put({
      id: ddoc._id,
      data: ddoc,
      callback: function(resp) {
        equal(resp._HTTP.status, 201, 'got a 201');

        //pump results into the ddoc
        couch.get({
          url: url,
          callback: function(resp) {
            equal(resp._HTTP.status, 200, 'got a 200');

            //store the value before we write again
            value = resp.body.rows[0].value;

            //set the default
            couch.setStaleDefault(true);

            //write another doc, making the view results stale
            couch.post({
              data: {},
              callback: function(resp) {
                equal(resp._HTTP.status, 201, 'got a 201');

                //grab the stale results
                couch.get({
                  url: url,
                  callback: function(resp) {
                    equal(resp._HTTP.status, 200, 'got a 200');
                    equal(resp.body.rows[0].value, value, 'got stale value');

                    couch.setStaleDefault(false).get({
                      url: url,
                      callback: function(resp) {
                        equal(resp._HTTP.status, 200, 'got a 200');
                        notEqual(resp.body.rows[0].value, value, 'got a new one');

                        start();
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
});

asyncTest('on()', function() {
  expect(2);

  makeCouch(true, function(couch) {
    couch.on('error', function(resp) {
      equal((resp._HTTP.status >= 400), true, 'Expected an error.');
    });

    couch.get({
      url: '/thisreallydoesnotexist',
      callback: function(resp, succ) {
        equal(succ, false, 'Expected an error.');

        start();
      }
    });
  });
});

asyncTest('deleteDatabase()', function() {
  expect(2);

  makeCouch(true, function(couch) {
    couch.deleteDatabase(dbName, function(resp) {
      equal(resp.body.ok, true, 'JSON body/parsing check');
      equal(resp._HTTP.status, '200', 'Proper HTTP code');

      start();
    });
  });
});

test('toString()', function() {
  var couch = sag.server('google.com', '123');
  couch.login({ user: 'u', pass: 'p' });
  couch.setDatabase('howdy');

  expect(2);

  equal(couch.toString(), 'http://u:p@google.com:123/howdy', 'Using toString');
  equal(couch + '', 'http://u:p@google.com:123/howdy', 'Auto-causing toString');
});

test('serverFromURL()', function() {
  var regCouch;

  var opts = {
    url: 'http://admin:passwd@sbisbee.cloudant.com:5984/sag',
    host: 'sbisbee.cloudant.com',
    port: '5984',
    user: 'admin',
    pass: 'passwd',
    db: 'sag'
  };

  expect(1);

  regCouch = sag.server(opts.host, opts.port);
  regCouch.login({ user: opts.user, pass: opts.pass });
  regCouch.setDatabase(opts.db);

  equal(sag.serverFromURL(opts.url) + '', regCouch + '', 'Check for the same Sag');
});
