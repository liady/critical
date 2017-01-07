var app = require('../index.js');
var url = 'http://amir.reseller-pagespeed-mb.d1test.biz/contact?preview=true'
var expected = require('fs').readFileSync('./utils/baseline.css');

app.handler({url: url, debug: true}, null, function(err, res){
    if(err) {
        throw err
    }
    var result = res.value;
    result = result.replace('#iefix&v=6','').replace('#fontawesomeregular?v=6','')
    result = result.replace('#iefix-ss0txf','').replace('#dm-font','')
    result = result.replace('../icons','/_dm/s/rt/dist/icons')
    console.log('Passed: ' + (result == expected))
});