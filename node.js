var sag = require('./src/sag.js').server('localhost', '5984');

sag.setStaleDefault(true).setDatabase('bwah');

sag.setCookie('AuthSession', 'bar');

sag.get({
  url: '/',
  callback: function(r) {
    console.log(r);
  }
});
