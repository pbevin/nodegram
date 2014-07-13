var async = require('async');
var fs = require('fs');
var http = require('http');

async.waterfall([ readFile, toLines, map(preprocess), serve ], errorHandler);

function readFile(cb) {
  fs.readFile(process.env.DICT || "/usr/share/dict/words", "utf8", cb);
}

function toLines(data, cb) {
  cb(null, data.split("\n"));
}

function errorHandler(err) { if(err) throw(err) }

function map(fn) {
  return function(data, cb) {
    cb(null, data.map(fn));
  }
}

function preprocess(word) {
  var letters = toLetters(word);
  var sorted = letters.split('').sort().join('');
  return {
    word: word,
    letters: letters,
    sorted: sorted
  };
}

function toLetters(word) {
  var letters = unaccent(word.toLowerCase());
  return letters.replace(/[^a-z]/gi, "");
}

function unaccent(letters) {
  var unaccented = "";
  var ch;
  letters.split('').forEach(function(ch) {
    unaccented += accentMap[ch] || ch;
  });
  return unaccented;
}

function serve(words) {
  console.log(words.slice(0, 10));
  http.createServer(function (req, res) {
    var path = req.url;
    var statusCode = 200;
    var pipeline;

    if (path.startsWith("/an/")) {
      pipeline = [ anagram(path.substring(4)), findMatches ];
    } else if (path.startsWith("/fw/")) {
      pipeline = [ patternMatch(path.substring(4)), findMatches ];
    } else {
      pipeline = [ withError("Not found.") ]
    }

    async.waterfall(pipeline, function(err, statusCode, text) {
      res.writeHead(statusCode, {'Content-Type': 'text/plain'});
      res.end(text);
    });
  }).listen(3000, '127.0.0.1');

  function anagram(pattern) {
    var sortedLetters = preprocess(pattern).sorted;

    return function(cb) {
      cb(null, fieldEquals("sorted", sortedLetters));
    }
  }

  function patternMatch(pattern) {
    var pattern = pattern.replace(/[^\.a-z]/gi, "");
    var regexp = new RegExp("^" + pattern + "$", "i");
    return function(cb) {
      cb(null, fieldMatches("letters", regexp));
    }
  }

  function findMatches(matcher, cb) {
    cb(null, 200, words.filter(matcher).map(pluck("word")).join("\n"));
  }

  function withError(text, cb) {
    cb(null, 404, text);
  }
}

function fieldEquals(key, value) {
  return function(word) {
    return word[key] == value;
  }
}

function fieldMatches(key, regexp) {
  return function(word) {
    return word[key].match(regexp);
  }
}

function pluck(key) {
  return function(word) {
    return word[key];
  }
}

String.prototype.startsWith = function (str){
  return this.indexOf(str) == 0;
};

var accentMap = {
  ä: 'a', à: 'a', á: 'a', â: 'a', ã: 'a', å: 'a',
  Ä: 'A', À: 'A', Á: 'A', Â: 'A', Ã: 'A', Å: 'A',
  Ç: 'C', ç: 'c', Ñ: 'N', ñ: 'n',
  È: 'E', É: 'E', Ê: 'E', Ë: 'E',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  Ì: 'I', Î: 'I', Ï: 'I',
  ì: 'i', î: 'i', ï: 'i',
  Ö: 'O', Ò: 'O', Ó: 'O', Ô: 'O', Ø: 'O',
  ö: 'o', ò: 'o', ó: 'o', ô: 'o', ø: 'o',
  Ü: 'U', Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U',
  ü: 'u', ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ß: 'ss'
};
