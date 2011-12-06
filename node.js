var sag = require('./src/sag.js').server('localhost', '5984');

sag.get({
  url: '/',
  callback: function(resp) {
    console.log(resp);
  }
});
