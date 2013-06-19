var vm = require('vm');
var fs = require('fs');

// this is the context in which all of our test code will run
var initSandbox = {
  console: console,
  require: require,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Buffer: Buffer
};

var context = vm.createContext(initSandbox);

if(!process.argv[2]) {
  console.log('No makeCouch.js specified');
  process.exit(1);
}

fs.readFile('../browser/qunit/qunit/qunit.js', 'utf-8', function(err, data) {
  if(err) {
    throw err;
  }

  vm.runInContext(data, context);

  fs.readFile('../../sag.js', 'utf-8', function(err, data) {
    if(err) {
      throw err;
    }

    vm.runInContext(data, context);

    fs.readFile(process.argv[2], 'utf-8', function(err, data) {
      vm.runInContext(data, context);

      fs.readFile('../sag-tests.js', 'utf-8', function(err, data) {
        if(err) {
          throw err;
        }

        vm.runInContext(data, context);
      });
    });
  });
});
