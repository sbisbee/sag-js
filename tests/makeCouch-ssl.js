module.exports = function(sag, dbName) {
  return function(setDB, loginCallback) {
    var couch = sag.server('localhost', '6984', true);

    var loginOpts = {
      user: 'admin',
      pass: 'passwd',
      type: sag.AUTH_COOKIE
    };

    if(typeof loginCallback === 'function') {
      loginOpts.callback = function(resp, succ) {
        loginCallback(couch);
      };
    }

    couch.login(loginOpts);

    if(setDB) {
      couch.setDatabase(dbName);
    }

    return couch;
  };
};
