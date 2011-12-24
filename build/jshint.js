var JSHINT = require('./lib/jshint/jshint.js').JSHINT;
var print = require('util').print;
var src = require('fs').readFileSync(process.argv[2], 'utf8');

JSHINT(src, {
  node: true,
  browser: true,
  evil: true,
  forin: true,
  maxerr: 100,
  noempty: true,
  nomen: false,
  node: true
});

var ok = {

  // w.reason
  "Expected an identifier and instead saw 'undefined' (a reserved word).": true,
  "Use '===' to compare with 'null'.": true,
  "Use '!==' to compare with 'null'.": true,
  "Expected an assignment or function call and instead saw an expression.": true,
  "Expected a 'break' statement before 'case'.": true,
  "'e' is already defined.": true,

  // w.raw
  "Expected an identifier and instead saw \'{a}\' (a reserved word).": true
};

var e = JSHINT.errors;
var found = 0;
var w;

for(var i = 0; i < e.length; i++) {
  w = e[i];

  if(!ok[w.reason] && !ok[w.raw]) {
    found++;

    print('\n' + found + '. Problem @ line ' + w.line + ' character ' + w.character + ': ' + w.reason);

    print('\n' + w.evidence);
  }
}

if(found > 0) {
  print('\n\n' + found + ' Error(s) found.\n');
  process.exit(1);
}

print('JSHint check passed.\n');
