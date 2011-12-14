var sag = require('./src/sag.js').server('localhost', '5984');

sag.setStaleDefault(true).setDatabase('bwah');

sag.createDatabase('test2', function(resp) {
  console.log(resp);

  sag.deleteDatabase('test2', function(resp) {
    console.log(resp);
  });
});
