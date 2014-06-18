var assert = require('assert');
var sag = require('../src/server.js');

var dbName = 'sag-js-describes';
var dbNameRepl = 'sag-js-describes-repl';

var makeCouch = require(process.env.MAKE_COUCH)(sag, dbName);

assert.isObject = function(target, msg) {
  assert.strictEqual(typeof target, 'object', msg);
};

assert.isFunction = function(target, msg) {
  assert.strictEqual(typeof target, 'function', msg);
};

describe('makeCouch() and server()', function() {
  it('should give us a good server object', function() {
    var couch = makeCouch(false);

    assert.isObject(couch);
    assert.isFunction(couch.get);
  });
});

describe('setPathPrefix()', function() {
  var couch = makeCouch();
  assert.isObject(couch.setPathPrefix(''));
});

describe('setDatabase() and currentDatabase()', function() {
  var couch = makeCouch(false);

  assert.strictEqual(couch.currentDatabase(), undefined, 'no db yet');

  assert.strictEqual(couch.setDatabase(dbName), couch, 'returns sag object');
  assert.strictEqual(couch.currentDatabase(), dbName, 'did it get set?');
});

describe('cookies', function() {
  var couch = makeCouch(false);

  assert.strictEqual(couch.setCookie('foo', 'bar'), couch, 'got the api back');

  assert.strictEqual(couch.getCookie('foo'), 'bar', 'set internally correctly');

  assert.strictEqual(couch.getCookie('a'), undefined, 'not set');
});

describe('createDatabase()', function() {
  makeCouch(false, function(couch) {
    couch.createDatabase(dbName, function(resp) {
      assert.strictEqual(resp.body.ok, true, 'JSON body/parsing check');
      assert.strictEqual(resp._HTTP.status, '201', 'Proper HTTP code');

      couch.deleteDatabase(dbName, function(r) {
        done();
      });
    });
  });
});

describe('setDatabase() and create if does not exist', function() {
  makeCouch(false, function(couch) {

    couch.setDatabase(dbName);

    couch.get({
      url: '/',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 404, 'expect it to not be there');

        couch.setDatabase(dbName, true, function(exists) {
          ok(exists, 'db should exist now');

          done();
        });
      }
    });
  });
});

describe('decode()', function() {
  makeCouch(true, function(couch) {
    assert.strictEqual(couch.decode(false), couch, 'returns the sag obj');

    couch.get({
      url: '/',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got a response');
        assert.strictEqual(typeof resp.body, 'string', 'no decode');

        couch.decode(true);

        couch.get({
          url: '/',
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a response');
            assert.strictEqual(typeof resp.body, 'object', 'no decode');

            done();
          }
        });
      }
    });
  });
});

describe('get()', function() {
  makeCouch(true, function(couch) {
    couch.get({
      url: '',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
        assert.strictEqual(typeof resp.body, 'object', 'body is decoded');

        done();
      }
    });
  });
});

describe('put()', function() {
  var docID = 'wellhellothere';
  var docData = {
    _id: docID,
    how: 'you doin',
    worked: true
  };

  makeCouch(true, function(couch) {
    couch.put({
      id: docID,
      data: docData,
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 201, 'got a 201');
        assert.strictEqual(resp.body.id, docID, 'got the id');

        docData._rev = resp.body.rev;

        couch.put({
          id: docID,
          data: docData,
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201, 'got a 201');

            //for the next call and its deepEqual()
            docData._rev = resp.body.rev;

            couch.get({
              url: docID,
              callback: function(resp) {
                deepEqual(resp.body, docData, 'got the body');

                done();
              }
            });
          }
        });
      }
    });
  });
});

describe('post()', function() {
  var docData = {
    foo: 'bar'
  };

  makeCouch(true, function(couch) {
    couch.post({
      data: docData,
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 201, 'got a 201');

        //for the next call and deepEqual
        docData._id = resp.body.id;
        docData._rev = resp.body.rev;

        couch.get({
          url: resp.body.id,
          callback: function(resp) {
            deepEqual(resp.body, docData, 'data got saved');

            done();
          }
        });
      }
    }); 
  });
});

describe('getAllDatabases()', function() {
  makeCouch(true, function(couch) {
    couch.getAllDatabases(function(resp) {
      var hasOurDb = false;

      assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
      ok(Array.isArray(resp.body));

      for(var i in resp.body) {
        if(resp.body[i] === dbName) {
          hasOurDb = true;
          break;
        }
      }

      ok(hasOurDb, 'Our DB should be in the list.');

      done();
    });
  });
});

describe('head()', function() {
  makeCouch(true, function(couch) {
    couch.head({
      url: '/',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
        assert.strictEqual(resp.body, false, 'no body in resp object');

        done();
      }
    });
  });
});

describe('post(), delete(), then head()', function() {
  makeCouch(true, function(couch) {
    couch.post({
      data: {},
      callback: function(resp) {
        var id = resp.body.id;
        var rev = resp.body.rev;

        assert.strictEqual(
          couch.delete(id, rev, function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a 200');

            couch.head({
              url: id,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 404, 'got a 404 after delete()');

                done();
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

describe('bulk()', function() {
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

  makeCouch(true, function(couch) {
    couch.bulk({
      docs: docs,
      callback: function(resp) {
        var i;

        assert.strictEqual(resp._HTTP.status, 201, 'got a 201 back');
        assert.strictEqual(resp.body.length, docs.length, 'proper array size');

        for(i in resp.body) {
          if(resp.body.hasOwnProperty(i)) {
            assert.strictEqual(resp.body[i].id, docs[i]._id, 'matching _id');
          }
        }

        done();
      }
    });
  });
});

describe('copy() to new doc', function() {
  makeCouch(true, function(couch) {
    couch.copy({
      srcID: 'one',
      dstID: 'oneCopy',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 201, 'got a 201 back');
        assert.strictEqual(resp.body.id, 'oneCopy', 'got the id back');

        done();
      }
    });
  });
});

describe('copy() to overwrite', function() {
  makeCouch(true, function(couch) {
    //overwrite 'two' with 'one'
    couch.get({
      url: 'two',
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got a 200 back');
        ok(resp.body._id, 'has an _id');
        ok(resp.body._rev, 'has a _rev');

        couch.copy({
          srcID: 'one',
          dstID: resp.body._id,
          dstRev: resp.body._rev,
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201, 'got a 201 back');

            done();
          }
        });
      }
    });
  });
});

describe('setAttachment()', function() {
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

        assert.strictEqual(resp._HTTP.status, 200, 'got a 200 back');

        couch.setAttachment({
          docID: doc.id,
          docRev: doc.rev,

          name: attachment.name,
          data: attachment.data,
          contentType: attachment.cType,

          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201, 'got a 201 back');

            couch.get({
              url: '/' + doc.id + '/' + attachment.name,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 200, 'got a 200 back');
                assert.strictEqual(resp.body, attachment.data, 'proper data');
                assert.strictEqual(
                  resp.headers['content-type'],
                  attachment.cType,
                  'proper Content-Type header'
                );

                done();
              }
            });
          }
        });
      }
    });
  });
});

describe('replicate()', function() {
  makeCouch(false, function(couch) {
    couch.replicate({
      source: dbName,
      target: dbNameRepl,
      createTarget: true,
      continuous: false,
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got a 200 back');
        ok(resp.body.ok, 'ok');

        couch.deleteDatabase(dbNameRepl);

        done();
      }
    });
  });
});

describe('getAllDocs()', function() {
  makeCouch(true, function(couch) {
    couch.getAllDocs({
      limit: 10,
      includeDocs: true,
      descending: true,
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 200, 'got our 200');

        done();
      }
    });
  });
});

describe('setStaleDefault() with view', function() {
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

  makeCouch(true, function(couch) {
    //create the ddoc
    couch.put({
      id: ddoc._id,
      data: ddoc,
      callback: function(resp) {
        assert.strictEqual(resp._HTTP.status, 201, 'got a 201');

        //pump results into the ddoc
        couch.get({
          url: url,
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a 200');

            //store the value before we write again
            value = resp.body.rows[0].value;

            //set the default
            couch.setStaleDefault(true);

            //write another doc, making the view results stale
            couch.post({
              data: {},
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 201, 'got a 201');

                //grab the stale results
                couch.get({
                  url: url,
                  callback: function(resp) {
                    assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
                    assert.strictEqual(resp.body.rows[0].value, value, 'got stale value');

                    couch.setStaleDefault(false).get({
                      url: url,
                      callback: function(resp) {
                        assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
                        notEqual(resp.body.rows[0].value, value, 'got a new one');

                        done();
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

describe('on()', function() {
  makeCouch(true, function(couch) {
    couch.on('error', function(resp) {
      assert.strictEqual((resp._HTTP.status >= 400), true, 'Expected an error.');
    });

    couch.get({
      url: '/thisreallydoesnotexist',
      callback: function(resp, succ) {
        assert.strictEqual(succ, false, 'Expected an error.');

        done();
      }
    });
  });
});

describe('deleteDatabase()', function() {
  makeCouch(true, function(couch) {
    couch.deleteDatabase(dbName, function(resp) {
      assert.strictEqual(resp.body.ok, true, 'JSON body/parsing check');
      assert.strictEqual(resp._HTTP.status, '200', 'Proper HTTP code');

      done();
    });
  });
});

describe('activeTasks()', function() {
  makeCouch(false, function(couch) {
    couch.activeTasks(function(resp, succ) {
      assert.strictEqual(resp._HTTP.status, '200', 'Proper HTTP code');
      assert.strictEqual(typeof resp.body, 'object', 'Valid body');

      done();
    });
  });
});

describe('toString()', function() {
  var couch = sag.server('google.com', '123');
  couch.login({ user: 'u', pass: 'p' });
  couch.setDatabase('howdy');

  assert.strictEqual(couch.toString(), 'http://u:p@google.com:123/howdy', 'Using toString');
  assert.strictEqual(couch + '', 'http://u:p@google.com:123/howdy', 'Auto-causing toString');
});

describe('serverFromURL()', function() {
  var regCouch;

  var opts = {
    url: 'http://admin:passwd@localhost:5984/sag',
    host: 'localhost',
    port: '5984',
    user: 'admin',
    pass: 'passwd',
    db: 'sag'
  };

  regCouch = sag.server(opts.host, opts.port);
  regCouch.login({ user: opts.user, pass: opts.pass });
  regCouch.setDatabase(opts.db);

  assert.strictEqual(sag.serverFromURL(opts.url) + '', regCouch + '', 'Check for the same Sag');
});
