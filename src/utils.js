exports.serverFromURL = function(url) {
  var parts;
  var sagRes;

  if(!url || typeof url !== 'string') {
    throw TypeError('You must provide a complete URL as a string.');
  }

  parts = parseURL(url);

  //create the server
  parts.host = parts.host.split(':');
  sagRes = exports.server(parts.host.shift(), parts.host.shift());

  //log the user in (if provided)
  if(parts.auth) {
    parts.auth = parts.auth.split(':');

    sagRes.login({
      user: parts.auth[0],
      pass: parts.auth[1]
    });
  }

  //set the database (if there's a path)
  if(typeof parts.path === 'string' && parts.path.length > 1) {
    sagRes.setDatabase(parts.path.split('/')[1]);
  }

  return sagRes;
};
