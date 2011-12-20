var dbName = 'sag-js-tests';
var dbNameRepl = 'sag-js-tests-repl';

var isArray = Array.isArray || function(arg) {
  return Object.prototype.toString.call(arg) == '[object Array]';
};

function makeCouch(setDB) {
  var couch = sag.server('localhost', '80');

  couch.setPathPrefix('/db');

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
  var couch;
  expect(1);

  couch = makeCouch(false);

  equal(typeof couch, 'object', 'server() should return an object');
});

test('setDatabase() and currentDatabase()', function() {
  var couch;
  expect(3);

  couch = makeCouch(false);

  equal(couch.currentDatabase(), undefined, 'no db yet');

  equal(couch.setDatabase(dbName), couch, 'returns sag object');
  equal(couch.currentDatabase(), dbName, 'did it get set?');
});

asyncTest('createDatabase()', function() {
  var couch;
  expect(3);

  couch = makeCouch(false);

  equal(
    couch.createDatabase(dbName, function(resp) {
      equal(resp.body.ok, true, 'JSON body/parsing check');
      equal(resp._HTTP.status, '201', 'Proper HTTP code');

      couch.deleteDatabase(dbName, function(r) {
        start();
      });
    }),
    couch,
    'returns sag object'
  );
});

asyncTest('setDatabase() and create if does not exist', function() {
  var couch;
  expect(2);

  couch = makeCouch(false);

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

asyncTest('decode()', function() {
  var couch;
  expect(5);

  couch = makeCouch(true);

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

asyncTest('get()', function() {
  var couch;
  expect(2);

  couch = makeCouch(true);

  couch.get({
    url: '',
    callback: function(resp) {
      equal(resp._HTTP.status, 200, 'got a 200');
      equal(typeof resp.body, 'object', 'body is decoded');

      start();
    }
  });
});

asyncTest('put()', function() {
  var couch;
  var docID = 'wellhellothere';
  var docData = {
    _id: docID,
    how: 'you doin',
    worked: true
  };

  expect(4);

  couch = makeCouch(true);

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

asyncTest('post()', function() {
  var couch;
  var docData = {
    foo: 'bar'
  };

  expect(2);

  couch = makeCouch(true);

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

asyncTest('getAllDatabases()', function() {
  var couch;
  expect(3);

  couch = makeCouch(true);

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

asyncTest('head()', function() {
  var couch = makeCouch(true);

  expect(3);

  equal(
    couch.head({
      url: '/',
      callback: function(resp) {
        equal(resp._HTTP.status, 200, 'got a 200');
        strictEqual(resp.body, undefined, 'no body in resp object');

        start();
      }
    }),
    couch,
    'Got the couch object back.'
  );
});

asyncTest('post(), delete(), then head()', function() {
  var couch = makeCouch(true);

  expect(3);

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

  var couch = makeCouch(true);

  expect(2 + docs.length);

  couch.bulk({
    docs: docs,
    callback: function(resp) {
      equal(resp._HTTP.status, 201, 'got a 201 back');
      equal(resp.body.length, docs.length, 'proper array size');

      for(var i in resp.body) {
        equal(resp.body[i].id, docs[i]._id, 'matching _id');
      }

      start();
    }
  });
});

asyncTest('copy() to new doc', function() {
  var couch = makeCouch(true);

  expect(2);

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

asyncTest('copy() to overwrite', function() {
  var couch = makeCouch(true);

  expect(4);

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

asyncTest('setAttachment()', function() {
  var couch = makeCouch(true);
  var attachment = {
    name: 'lyrics',
    data: 'If I could turn back time...',
    cType: 'text/ascii'
  };

  couch.get({
    url: 'one',
    callback: function(resp) {
      var doc = {
        id: resp.body._id,
        rev: resp.body._rev
      }

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

asyncTest('replicate()', function() {
  var couch = makeCouch(false);

  expect(2);

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

asyncTest('getAllDocs()', function() {
  var couch = makeCouch(true);

  expect(1);

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

asyncTest('deleteDatabase()', function() {
  var couch;
  expect(3);

  couch = makeCouch(false);

  equal(
    couch.deleteDatabase(dbName, function(resp) {
      equal(resp.body.ok, true, 'JSON body/parsing check');
      equal(resp._HTTP.status, '200', 'Proper HTTP code');

      start();
    }),
    couch,
    'returns sag object'
  );
});
