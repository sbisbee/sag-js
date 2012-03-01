(function(exports) {
  var isArray = Array.isArray || function(arg) {
    return Object.prototype.toString.call(arg) == '[object Array]';
  };

  //auth types
  exports.AUTH_BASIC = 'AUTH_BASIC';
  exports.AUTH_COOKIE = 'AUTH_COOKIE';
