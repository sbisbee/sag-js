var dbName = 'db/sag-js-tests';

function makeCouch(setDB) {
  var couch = sag.server('localhost', '80');

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

test('setDatabase()', function() {
  var couch;
  expect(2);

  couch = makeCouch(false);

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
        ok(exists, 'db should exist by now');

        start();
      });
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
