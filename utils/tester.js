var s = "Hello";

var zippedContents = require('zlib').gzipSync(JSON.stringify(s));
require('fs').writeFileSync('test.txt', zippedContents);

var a = require('fs').readFileSync('./test.txt');
console.log(require('../lib/phantomjs/zlib').gunzipSync(a).toString())