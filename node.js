var sag = require('./src/sag.js').server('localhost', '5984');

sag.get('/', function(r) {
  console.log(r);
});
