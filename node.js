var sag = require('./src/sag.js').server('localhost', '5984');

sag.setStaleDefault(true).setDatabase('bwah');

sag.getAllDocs({
  descending: true,
  callback: function(r) {
    console.log(r);
  }
});
