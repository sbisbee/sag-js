var sag = require('./src/sag.js').server('localhost', '5984');

sag.setDatabase('bwah');

sag.get({
  url: 'me',
  callback: function(resp) {
    sag.delete(resp.body._id, resp.body._rev, function(resp) {
      console.log('delete', resp);

      sag.put({
        data: { _id: 'me', hi: 'there' },
        id: 'me'
      });
    });
  }
});

sag.head({
  url: '/',
  callback: function(resp) {
    console.log('head', resp);
  }
});
