var fs = require('fs')

var pre = fs.readFileSync('./utils/pre.css', 'utf8');

var ffRemover = require('../lib/postformatting/unused-fontface-remover')
var quickffRemover = require('../lib/postformatting/quick-unused-fontface-remover')

console.time('slow')
// fs.writeFileSync('./utils/slow.css', ffRemover(pre));
console.timeEnd('slow')

console.time('quick')
fs.writeFileSync('./utils/quick.css', quickffRemover(pre));
console.timeEnd('quick')