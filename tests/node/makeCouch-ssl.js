function makeCouch(setDB, loginCallback) {
  var couch = sag.server('localhost', '6984', null, null, true);

  var loginOpts = {
    user: 'admin',
    pass: 'passwd',
    type: sag.AUTH_COOKIE
  };

  if(typeof loginCallback === 'function') {
    loginOpts.callback = loginCallback;
  }

  couch.login(loginOpts);

  if(setDB) {
    couch.setDatabase(dbName);
  }

  return couch;
}
