// var url = 'http://amir.reseller-pagespeed-mb.d1test.biz?preview=true';
var outputfile = 'out.css';
var path = require('path')
var fs = require('fs')
var args = process.argv
var url = args[2]
var outputfile = args[3] || 'critical.css';
var app = require('./index.js');

console.log('Extracting CSS from: ' + url);
critical(true).catch(function(err) {
    console.log('Error: ' + err);
    console.log();
    console.log('Retry extracting CSS from: ' + url);
    critical(false)
})

function critical(strict) {
    return new Promise(function(resolve, reject) {
        app.handler({url: url, debug: true, timeout: 100000, strict: strict, clearTemp: true}, null, function(err, res){
            if(err) {
                reject(err)
            }
            console.log('Writing to: ' + outputfile);
            fs.writeFileSync(path.join('./', outputfile), res.value);
            resolve(outputfile);
        });
    })
}