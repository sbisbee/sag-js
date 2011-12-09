var sag = require('./src/sag.js').server('localhost', '5984');

sag.setDatabase('bwah');

sag.post({
  data: { hi: 'there' },
  callback: function(resp) {
    sag.get({
      url: resp.body.id,
      callback: function(resp) {
        console.log(resp);
      }
    });
  }
});

sag.getAllDatabases(function(res) {
  console.log('Databases:');

  for(var i in res.body) {
    console.log('\t' + res.body[i]);
  }
});

sag.generateIDs({
  count: 10,
  callback: function(res) {
    console.log(res.body);
  }
});

sag.put({
  id: 'me',
  data: {
    _id: 'me'
  },
  callback: function(res) {
    console.log('put response', res);
  }
});
