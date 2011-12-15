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
  expect(1);

  couch = makeCouch(false);

  equal(couch.setDatabase(dbName), couch, 'returns sag object');
});

asyncTest('createDatabase()', function() {
  var couch;
  expect(2);

  couch = makeCouch(false);

  couch.createDatabase(dbName, function(resp) {
    equal(resp.body.ok, true, 'JSON body/parsing check');
    equal(resp._HTTP.status, '201', 'Proper HTTP code');

    start();
  });
});

asyncTest('deleteDatabase()', function() {
  var couch;
  expect(2);

  couch = makeCouch(false);

  couch.deleteDatabase(dbName, function(resp) {
    equal(resp.body.ok, true, 'JSON body/parsing check');
    equal(resp._HTTP.status, '200', 'Proper HTTP code');

    start();
  });
});
