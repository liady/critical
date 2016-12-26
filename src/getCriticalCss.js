var penthouse = require('../lib/index.js');
var path = require('path');
var fs = require('fs');
var fetch = require('node-fetch')
var cheerio = require('cheerio')
var osTmpdir = require('os-tmpdir')
var TMP_DIR = osTmpdir()
var tmp = require('tmp')
var CssMinifier = require('clean-css');

function getText(url) {
    return fetch(url).then(function(res) {
        return res.text();
    });
}

function readCssSources(url, callback) {
    var parsedUrl = url.split('?')[0];
    return getText(url).then(function(html) {
        var $ = cheerio.load(html);
        var cssStringPromises = [];
        var hrefs = {};
        $('link[rel=stylesheet], style').map(function(i, el) {
            var $el = $(this);
            if($el.attr('href')) {
                var res = $el.attr('href');
                var linkHref = res[1]==='/' ? 'http:' + res : parsedUrl + res;
                if(!hrefs[linkHref]) {
                    console.log('Found Link: ' + linkHref)
                    hrefs[linkHref] = true;
                    cssStringPromises.push(getText(linkHref));
                }
            } else if($el.text()) {
                console.log('Found Style Element: ' + $el.attr('id'))
                cssStringPromises.push(Promise.resolve($el.text()));
            }
        });

        return Promise.all(cssStringPromises).then(function(cssStrings) {
            var css = cssStrings.join('');
            var tmpobj = tmp.fileSync({dir: TMP_DIR})
            console.log('Writing to a temp file: ' + tmpobj.name);
            fs.writeFileSync(tmpobj.name, css)
            return tmpobj.name
        });
    });
}

function processCss(url, cssfilepath) {
    penthouse.DEBUG = true;
    return new Promise(function(resolve, reject){
        console.log('Start Processing');
        penthouse({
            url: url,
            css: cssfilepath,
            strict: true
        }, function(err, criticalCss) {
            if (err) {
                console.log('error:' + err)
                // handle error
                reject(err);
            }
            console.log('End Processing');
            resolve(criticalCss);
        });
    })
}

module.exports = function getCriticalCssFromUrl(url) {
    return readCssSources(url)
    .then(function(cssfilepath){
        return processCss(url, cssfilepath);
    })
    .then(function(criticalCss){
        return new CssMinifier().minify(criticalCss).styles;
    })
    .catch(function(e){
        console.log(e);
        throw e
    });
}