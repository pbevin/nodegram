var async = require('async');
var fs = require('fs');
var http = require('http');

async.waterfall([ readFile, toLines, mapWith(preprocess), serve ], errorHandler);

function readFile(cb) {
  fs.readFile("/usr/share/dict/words", "utf8", cb);
}

function toLines(data, cb) {
  cb(null, data.split("\n"));
}

function errorHandler(err) { if(err) throw(err) }

function mapWith(fn) {
  return function(data, cb) {
    cb(null, data.map(fn));
  }
}

function preprocess(word) {
  var letters = word.toLowerCase().replace(/[^a-z]/g, "");
  var sorted = letters.split('').sort().join('');
  return {
    word: word,
    letters: letters,
    sorted: sorted
  };
}

function serve(words) {
  http.createServer(function (req, res) {
    var word = req.url.replace("/", "");

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(lookup(word) + "\n");
  }).listen(3000, '127.0.0.1');

  function lookup(word) {
    var sortedLetters = preprocess(word).sorted;
    var matches = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i].sorted == sortedLetters) {
        matches.push(words[i].word);
      }
    }

    return matches.join("\n");
  }
}
