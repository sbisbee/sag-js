var assert = require('assert');
var sag = require('../src/server.js');

var DB_NAME = 'sag-js-tests';
var DB_NAME_REPL = 'sag-js-tests-repl';

var makeCouch = require(process.env.MAKE_COUCH)(sag, DB_NAME);

assert.isType = function(target, expected, msg) {
  assert.strictEqual(typeof target, expected, msg);
};

assert.isObject = function(target, msg) {
  assert.isType(target, 'object', msg);
};

assert.isFunction = function(target, msg) {
  assert.isType(target, 'function', msg);
};

assert.isArray = function(target, msg) {
  assert.ok(Array.isArray(target), msg);
};

describe('assume db is not created yet', function() {
  describe('makeCouch() and server()', function() {
    it('should give us a good server object', function() {
      var couch = makeCouch(false);

      assert.isObject(couch);
      assert.isFunction(couch.get);
    });
  });

  describe('setPathPrefix()', function() {
    it('should return sag', function() {
      var couch = makeCouch();
      assert.isObject(couch.setPathPrefix(''));
      assert.isFunction(couch.get);
    });
  });

  describe('setDatabase() and currentDatabase()', function() {
    it('should set the database', function() {
      var couch = makeCouch(false);

      assert.strictEqual(couch.currentDatabase(), undefined, 'no db yet');
      assert.isObject(couch.setDatabase(DB_NAME));
      assert.strictEqual(couch.currentDatabase(), DB_NAME, 'did it get set?');
    });
  });

  describe('cookies', function() {
    it('should set and retrieve cookies', function() {
      var couch = makeCouch(false);

      assert.isObject(couch.setCookie('foo', 'bar'), 'got the api back');
      assert.strictEqual(couch.getCookie('foo'), 'bar', 'set internally correctly');
      assert.strictEqual(couch.getCookie('a'), undefined, 'not set');
    });
  });

  describe('createDatabase()', function() {
    after(function(done) {
      makeCouch(false, function(couch) {
        couch.deleteDatabase(DB_NAME, function(r) {
          done();
        });
      });
    });

    it('should create a database', function(done) {
      makeCouch(false, function(couch) {
        couch.createDatabase(DB_NAME, function(resp) {
          assert.ok(resp.body.ok);
          assert.strictEqual(resp._HTTP.status, 201, 'Proper HTTP code');

          done();
        });
      });
    });
  });

  describe('setDatabase() and create if does not exist', function() {
    it('should check and create the db', function(done) {
      makeCouch(false, function(couch) {
        couch.setDatabase(DB_NAME);

        couch.get({
          url: '/',
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 404, 'expect it to not be there');

            couch.setDatabase(DB_NAME, true, function(exists) {
              assert.ok(exists, 'db should exist now');

              done();
            });
          }
        });
      });
    });
  });

  describe('activeTasks()', function() {
    it('should check /_active_tasks', function(done) {
      makeCouch(false, function(couch) {
        couch.activeTasks(function(resp, succ) {
          assert.strictEqual(resp._HTTP.status, 200);
          assert.isObject(resp.body);

          done();
        });
      });
    });
  });

  describe('toString()', function() {
    it('should properly generate a string of connection info', function() {
      var couch = sag.server('example.com', '123');
      couch.login({ user: 'u', pass: 'p' });
      couch.setDatabase('howdy');

      assert.strictEqual(couch.toString(), 'http://u:p@example.com:123/howdy',
        'Explicitly invoking toString');
      assert.strictEqual(couch + '', 'http://u:p@example.com:123/howdy',
        'Inherently invoking toString');
    });
  });

  describe('serverFromURL()', function() {
    it('should generate a new server object', function() {
      var builtCouch;
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

      builtCouch = sag.serverFromURL(opts.url);

      assert.strictEqual(builtCouch.toString(), regCouch.toString());
    });
  });
});

describe('assume db is already created', function() {
  beforeEach(function(done) {
    makeCouch(false, function(couch) {
      couch.createDatabase(DB_NAME, function(resp) {
        done();
      });
    });
  });

  afterEach(function(done) {
    makeCouch(false, function(couch) {
      couch.deleteDatabase(DB_NAME, function(resp) {
        done();
      });
    });
  });
      
  describe('get()', function() {
    it('should get the db root', function(done) {
      makeCouch(true, function(couch) {
        couch.get({
          url: '',
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
            assert.isObject(resp.body);

            done();
          }
        });
      });
    });
  });

  describe('decode()', function() {
    it('should not decode the response body', function(done) {
      makeCouch(true, function(couch) {
        couch.decode(false);

        couch.get({
          url: '/',
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a response');
            assert.isType(resp.body, 'string');

            couch.decode(true);

            couch.get({
              url: '/',
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 200, 'got a response');
                assert.isObject(resp.body);

                done();
              }
            });
          }
        });
      });
    });
  });

  describe('put()', function() {
    it('should create the doc then update it', function(done) {
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

                //for the next call and its assert.deepEqual()
                docData._rev = resp.body.rev;

                couch.get({
                  url: docID,
                  callback: function(resp) {
                    assert.deepEqual(resp.body, docData, 'got the body');

                    done();
                  }
                });
              }
            });
          }
        });
      });
    });
  });

  describe('post()', function() {
    it('should create the doc and confirm', function(done) {
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
                assert.deepEqual(resp.body, docData, 'data got saved');

                done();
              }
            });
          }
        }); 
      });
    });
  });

  describe('getAllDatabases()', function() {
    it('should call _all_dbs and find our DB_NAME', function(done) {
      makeCouch(true, function(couch) {
        couch.getAllDatabases(function(resp) {
          assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
          assert.ok(Array.isArray(resp.body));
          assert.ok(resp.body.indexOf(DB_NAME) >= 0);

          done();
        });
      });
    });
  });

  describe('head()', function() {
    it('should get the HEAD from db root', function(done) {
      makeCouch(true, function(couch) {
        couch.head({
          url: '/',
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 200, 'got a 200');
            assert.strictEqual(resp.body, '', 'no body in resp object');

            done();
          }
        });
      });
    });
  });

  describe('post(), delete(), then head()', function() {
    it('should create, delete, and check a doc', function(done) {
      makeCouch(true, function(couch) {
        couch.post({
          data: {},
          callback: function(resp) {
            var id = resp.body.id;
            var rev = resp.body.rev;

            couch.delete(id, rev, function(resp) {
              assert.strictEqual(resp._HTTP.status, 200, 'got a 200');

              couch.head({
                url: id,
                callback: function(resp) {
                  assert.strictEqual(resp._HTTP.status, 404, 'got a 404 after delete()');

                  done();
                }
              });
            });
          }
        });
      });
    });
  });

  describe('bulk()', function() {
    it('should bulk create docs', function(done) {
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
  });

  describe('copy()', function() {
    it('copy a doc to a new location', function(done) {
      makeCouch(true, function(couch) {
        var origDoc = { _id: 'one' };
        var newID = origDoc._id + '-copy';

        couch.put({
          id: origDoc._id,
          data: origDoc,
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201);

            couch.copy({
              srcID: origDoc._id,
              dstID: newID,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 201);
                assert.strictEqual(resp.body.id, newID);

                done();
              }
            });
          }
        });
      });
    });

    it('should overwrite an existing doc with another', function(done) {
      makeCouch(true, function(couch) {
        var srcDoc = { _id: 'one' };
        var dstDoc = { _id: 'two' };

        couch.bulk({
          docs: [ srcDoc, dstDoc ],
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201);
            assert.isArray(resp.body);
            assert.strictEqual(resp.body.length, 2);

            couch.copy({
              srcID: resp.body[0].id,
              dstID: resp.body[1].id,
              dstRev: resp.body[1].rev,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 201);

                done();
              }
            });
          }
        });
      });
    });
  });

  describe('setAttachment()', function() {
    it('should write and verify an attachment', function(done) {
      var attachment = {
        name: 'lyrics',
        data: 'If I could turn back time...',
        cType: 'text/ascii'
      };

      makeCouch(true, function(couch) {
        couch.put({
          id: 'one',
          data: { _id: 'one' },
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201);
            assert.isObject(resp.body);

            couch.setAttachment({
              docID: resp.body.id,
              docRev: resp.body.rev,

              name: attachment.name,
              data: attachment.data,
              contentType: attachment.cType,

              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 201);

                couch.get({
                  url: '/one/' + attachment.name,
                  callback: function(resp) {
                    assert.strictEqual(resp._HTTP.status, 200);
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
  });

  describe('getAllDocs()', function() {
    it('should bulk load some docs and then read some back', function(done) {
      makeCouch(true, function(couch) {
        var docs = [
          { _id: '0', a: 'first' },
          { _id: '1', a: 'second' },
          { _id: '2', a: 'third' }];

        couch.bulk({
          docs: docs,
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201);

            couch.getAllDocs({
              limit: 2,
              includeDocs: true,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 200);
                assert.strictEqual(resp.body.total_rows, docs.length);
                assert.isArray(resp.body.rows);
                assert.strictEqual(resp.body.rows.length, 2);
                assert.strictEqual(resp.body.rows[0].doc.a, docs[0].a);
                assert.strictEqual(resp.body.rows[1].doc.a, docs[1].a);

                done();
              }
            });
          }
        });
      });
    });
  });

  describe('deleteDatabase()', function() {
    it('should delete the database', function(done) {
      makeCouch(true, function(couch) {
        couch.deleteDatabase(DB_NAME, function(resp) {
          assert.strictEqual(resp.body.ok, true);
          assert.strictEqual(resp._HTTP.status, 200);

          done();
        });
      });
    });
  });

  describe('setStaleDefault()', function() {
    it('should do complex stale/hot view querying and building', function(done) {
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
        //create the ddoc and an initial doc
        couch.bulk({
          docs: [ ddoc, {} ],
          callback: function(resp) {
            assert.strictEqual(resp._HTTP.status, 201);

            //pump results into the ddoc
            couch.get({
              url: url,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 200);

                //store the value before we write again
                value = resp.body.rows[0].value;

                //set the default, returning the server API
                assert.isObject(couch.setStaleDefault(true));

                //write another doc, making the view results stale
                couch.post({
                  data: {},
                  callback: function(resp) {
                    assert.strictEqual(resp._HTTP.status, 201);

                    //grab the stale results
                    couch.get({
                      url: url,
                      callback: function(resp) {
                        assert.strictEqual(resp._HTTP.status, 200);
                        assert.strictEqual(resp.body.rows[0].value, value,
                          'got stale value');

                        couch.setStaleDefault(false).get({
                          url: url,
                          callback: function(resp) {
                            assert.strictEqual(resp._HTTP.status, 200);
                            assert.ok(resp.body.rows[0].value !== value,
                              'got a new value');

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
  });

  describe('replicate()', function() {
    after(function(done) {
      makeCouch(false, function(couch) {
        couch.deleteDatabase(DB_NAME_REPL, function(resp) {
          done();
        });
      });
    });

    it('should create some docs and then replicate them', function(done) {
      makeCouch(true, function(couch) {
        couch.bulk({
          docs: [{}, {}],
          callback: function(bulkResp) {
            assert.strictEqual(bulkResp._HTTP.status, 201);

            couch.replicate({
              source: DB_NAME,
              target: DB_NAME_REPL,
              createTarget: true,
              continuous: false,
              callback: function(resp) {
                assert.strictEqual(resp._HTTP.status, 200);
                assert.ok(resp.body.ok);

                newCouch = makeCouch(false);
                newCouch.setDatabase(DB_NAME_REPL);
                newCouch.getAllDocs({
                  callback: function(resp) {
                    assert.strictEqual(resp._HTTP.status, 200);
                    assert.isArray(resp.body.rows);
                    assert.strictEqual(resp.body.rows.length, 2);
                    assert.strictEqual(resp.body.rows[0].id,
                      bulkResp.body[0].id);
                    assert.strictEqual(resp.body.rows[1].id,
                      bulkResp.body[1].id);

                    done();
                  }
                });
              }
            });
          }
        });
      });
    });
  });
});
