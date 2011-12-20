var dbName = 'sag-js-tests';

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
  }

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
