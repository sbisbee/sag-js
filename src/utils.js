var parseURL = require('url').parse;

module.exports.serverFromURL = function(url) {
  var parts;
  var sagRes;
  var useSSL;

  var i;

  if(!url || typeof url !== 'string') {
    throw TypeError('You must provide a complete URL as a string.');
  }

  parts = parseURL(url);
  useSSL = parts.protocol === 'https:';

  //create the server
  i = parts.host.indexOf('@');

  if(i > -1) {
    parts.host = parts.host.split('@')[1];
  }

  i = null;
  parts.host = parts.host.split(':');

  sagRes = module.exports.server(
      parts.host[0],
      parts.host[1] || ((useSSL) ? 443 : 80),
      useSSL);

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
  else if(typeof parts.pathname === 'string' && parts.pathname.length > 1) {
    sagRes.setDatabase(parts.pathname.split('/')[1]);
  }

  return sagRes;
};

/*
 * Pass in the rows from a view function (ie., response.body.rows) that uses
 * complex keys and a tree of objects will be returned. The end values are
 * always in an array, even if there is only one value.
 *
 * For example:
 *
 * ``
 * var rows = [
 *   { key: [ "a", 0 ], value: "first" },
 *   { key: [ "a", 1 ], value: "second" },
 *   { key: [ "b", 0 ], value: "third" }
 * ];
 *
 * console.log(sag.rowsToTree(rows));
 * ''
 *
 * Would give you this:
 * { "a": { "0": [ "first" ], "1": [ "second" ] }, "b": { "0": [ "third" ] } }
 */
module.exports.rowsToTree = function(rows) {
  var tree = {};

  rows.forEach(function(row) {
    var currNode = tree;

    row.key.forEach(function(currKey, i, keys) {
      if(!currNode[currKey]) {
        currNode[currKey] = (keys[i + 1] !== undefined) ? {} : [];
      }

      currNode = currNode[currKey];
    });

    currNode.push(row.value);
  });

  return tree;
};
