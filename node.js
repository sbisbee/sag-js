var sag = require('./src/sag.js').server('localhost', '5984');

sag.setDatabase('bwah');

sag.get({
  url: 'bwah',
  callback: function(resp) {
    sag.copy({
      srcID: 'me',
      dstID: 'bwah',
      dstRev: resp.body._rev,
      callback: function(resp) {
        console.log(resp);
      }
    });
  }
});
