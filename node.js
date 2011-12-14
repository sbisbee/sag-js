var sag = require('./src/sag.js').server('localhost', '5984');

sag.setStaleDefault(true).setDatabase('bwah');

sag.post({
  data: {},
  callback: function(resp) {
    sag.setAttachment({
      name: 'bwah',
      docID: resp.body.id,
      revID: resp.body.rev,
      data: 'Somewhere',
      contentType: 'text/ascii',
      callback: function(resp) {
        console.log(resp);
      }
    });
  }
}); 
