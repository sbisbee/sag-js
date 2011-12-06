var sag = require('./src/sag.js').server('localhost', '5984');

sag.setDatabase('bwah');

sag.get({
  url: '/',
  callback: function(resp) {
    console.log(resp);
  }
});
