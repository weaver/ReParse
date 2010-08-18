/// json -- an example JSON parser
//
// Running this program compares parse times for the Node.JS built-in
// JSON parser, a PEG.js parser built from the PEG.js example JSON
// grammar, and ReParse.

var sys = require('sys'),
    ReParse = require('../lib/reparse').ReParse,
    peg = require('./pegjson').parser;

function parse(data) {
  return (new ReParse(data, true)).start(value);
}

function object() {
  return this.between(/^\{/, /^\}/, members).reduce(function(obj, pair) {
    obj[pair[1]] = pair[3];
    return obj;
  }, {});
}

function members() {
  return this.sepBy(pair, /^,/);
}

function pair() {
  return this.seq(string, /^:/, value);
}

function array() {
  return this.between(/^\[/, /^\]/, elements);
}

function elements() {
  return this.sepBy(value, /^,/);
}

function value() {
  return this.choice(literal, string, number, array, object);
}

var LITERAL = { 'true': true, 'false': false, 'null': null };
function literal() {
  return LITERAL[this.match(/^(true|false|null)/)];
}

var SPECIAL = { '"': 34, '\\': 92, '/': 47, 'b': 8, 'f': 12, 'n': 10, 'r': 13, 't': 9};
function string() {
  var chars = this.match(/^"((?:\\["\\/bfnrt]|\\u[0-9a-fA-F]{4}|[^"\\])*)"/);
  return chars.replace(/\\(["\\/bfnrt])|\\u([0-9a-fA-F]{4})/g, function(_, $1, $2) {
    return String.fromCharCode($1 ? SPECIAL[$1] : hex($2));
  });
}

function number() {
  var ipart = this.produce(integer),
      fpart = this.option(frac, 0),
      epart = this.option(exp, 0);
  return ((ipart < 0) ? ipart - fpart : ipart + fpart) * Math.pow(10, epart);
}

function integer() {
  return (this.option(/^\-/) ? -1 : 1) * this.produce(digits);
}

function digits() {
  return iPart(this.match(/^\d+/));
}

function frac() {
  return fPart(this.match(/^\.(\d+)/));
}

function exp() {
  var sign = (this.match(/^e([\+\-]?)/i) == '-') ? -1 : 1;
  return sign * this.produce(digits);
}


/// --- Aux

function iPart(digits) {
  for (var i = 0, l = digits.length, r = 0; i < l; i++)
    r = r * 10 + digits.charCodeAt(i) - 48;
  return r;
}

function fPart(digits) {
  for (var i = 0, l = digits.length, s = 10, r = 0; i < l; i++, s *= 10)
    r += ((digits.charCodeAt(i) - 48) / s);
  return r;
}

function hex(digits) {
  var result = 0,
      code;

  digits = digits.toUpperCase();
  for (var i = 0, l = digits.length; i < l; i++) {
    code = digits.charCodeAt(i);
    result = result * 16 + code - (code >= 65 ? 55 : 48);
  }

  return result;
}

function capture(stream, encoding, fn) {
  var data = '';

  stream.setEncoding(encoding);

  stream.on('data', function(chunk) {
    data += chunk;
  });

  stream.on('end', function() {
    fn(data);
  });
}

function time(label, reps, fn) {
  var start = Date.now();
  for (var i = 0; i < reps; i++)
    fn();
  sys.puts(label + ': ' + (Date.now() - start));
}


/// --- Main Program

var input = '{"a": [1, "foo", [], {"foo": 1, "bar": [1, 2, 3]}] }';

time('JSON', 1000, function() {
  JSON.parse(input);
});

time('PEG.js', 1000, function() {
  peg.parse(input);;
});

time('ReParse', 1000, function() {
  parse(input);
});
