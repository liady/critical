// var url = 'http://amir.reseller-pagespeed-mb.d1test.biz?preview=true';
var outputfile = 'out.css';
var path = require('path')
var fs = require('fs')
var args = process.argv
var url = args[2]
var outputfile = args[3] || 'critical.css';
var app = require('./index.js');

console.log('Extracting CSS from: ' + url);
app.handler({url: url, debug: true, renderWaitTime: 4000}, null, function(err, res){
    if(err) {
        throw err
    }
    console.log('Writing to: ' + outputfile);
    fs.writeFileSync(path.join('./', outputfile), JSON.parse(res.body).value);
});