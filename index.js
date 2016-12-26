// var url = 'http://amir.reseller-pagespeed-mb.d1test.biz?preview=true';
var outputfile = 'out.css';
var path = require('path')
var fs = require('fs')
var args = process.argv
var url = args[2]
var outputfile = args[3] || 'out.css';
var getCriticalCss = require('./src/getCriticalCss.js');

console.log('Extracting CSS from: ' + url);
getCriticalCss(url).then(function(minifiedCss){
    console.log('Writing to: ' + outputfile);
    fs.writeFileSync(path.join('./', outputfile), minifiedCss);
});

