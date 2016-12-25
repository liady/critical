var penthouse = require('./penthouse/lib/index.js');
var path = require('path');
var fs = require('fs');
var __basedir = './';
var fetch = require('node-fetch')
var cheerio = require('cheerio')

function getText(url) {
    return fetch(url).then(function(res) {
        return res.text();
    });
}

function preprocess(url, callback) {
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
                    console.log(linkHref)
                    hrefs[linkHref] = true;
                    cssStringPromises.push(getText(linkHref));
                }
            } else if($el.text()) {
                console.log($el.text())
                cssStringPromises.push(Promise.resolve($el.text()));
            }
        });

        Promise.all(cssStringPromises).then(function(cssStrings) {
            var css = cssStrings.reduce(function(acc, cur) {
                acc += cur;
                return acc;
            }, '');
            var cssfileName = './temp.css';
            fs.writeFileSync(cssfileName, css);
            callback(url, cssfileName)
        });
    });
}

function processCss(url, cssfilepath) {
    penthouse.DEBUG = true;

    return penthouse({
        url: url,
        css: cssfilepath,
        strict: true
    }, function(err, criticalCss) {
        if (err) {
            console.log('error:' + err)
            // handle error
            throw err;
        }
        fs.writeFileSync('outfile.css', criticalCss);
    });
}

preprocess('http://amir.reseller-pagespeed-mb.d1test.biz?preview=true', processCss).catch(function(e){console.log(e)});