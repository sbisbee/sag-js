/*
 * Runs the test, injecting the requested makeCouch*.js file.
 *
 * Usage: node ./run.js <makeCouch.js> <file-test.js>
 */

var vm = require('vm');
var fs = require('fs');

var couchFile = fs.readFileSync(process.argv[2]);
var testFile = fs.readFileSync(process.argv[3]);

var context = vm.createContext({
  console: console,
  require: require
});

vm.runInContext(couchFile, context);
vm.runInContext(testFile, context);
