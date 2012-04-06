function makeCouch(setDB, loginCallback) {
  var couch = sag.server('localhost', '5984');

  if(loginCallback) {
    couch.login({
      user: 'admin',
      pass: 'passwd',
      type: sag.AUTH_COOKIE,
      callback: loginCallback
    });
  }

  if(setDB) {
    couch.setDatabase(dbName);
  }

  return couch;
}
