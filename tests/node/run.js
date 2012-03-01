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

fs.readFile('../browser/qunit/qunit/qunit.js', 'utf-8', function(err, data) {
  if(err) {
    throw err;
  }

  vm.runInContext(data, context);

  context.QUnit.testStart = function(res) {
    console.log('Test: %s', res.name);
  };

  context.QUnit.testDone = function(res) {
    if(res.failed) {
      console.log('-----');
    }
  };

  context.QUnit.log = function(res) {
    if(!res.result) {
      console.log(res);
    }
  };

  context.QUnit.done = function(res) {
    console.log(
      '\nPassed:\t\t%d\nFailed:\t\t%d\nTotal Run:\t%d\nSeconds:\t%d\n',
      res.passed,
      res.failed,
      res.total,
      res.runtime
    );
  };

  //force test order - see https://github.com/jquery/qunit/issues/74
  context.QUnit.config.reorder = false;

  //forces qunit's internal queue to run the tests in order instead of asyncly
  context.QUnit.config.autorun = false;

  fs.readFile('../../sag.js', 'utf-8', function(err, data) {
    if(err) {
      throw err;
    }

    vm.runInContext(data, context);

    fs.readFile('../sag-tests.js', 'utf-8', function(err, data) {
      if(err) {
        throw err;
      }

      vm.runInContext(data, context);
    });
  });
});
