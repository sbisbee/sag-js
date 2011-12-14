var sag = require('./src/sag.js').server('localhost', '5984');

sag.setStaleDefault(true).setDatabase('bwah');

sag.replicate({
  source: 'bwah',
  target: 'bwah2',
  createTarget: true,
  callback: function(r) {
    console.log(r);

    sag.getAllDatabases(function(r) { console.log(r); });
  }
});
