var penthouse = require('../lib/index.js');
var path = require('path');
var fs = require('fs');
var fetch = require('node-fetch')
var cheerio = require('cheerio')
var urlResolver = require('url')
var CssMinifier = require('clean-css');

function getText(url) {
    return fetch(url).then(res => res.text());
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
                var linkHref = urlResolver.resolve(url, res);
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

        return Promise.all(cssStringPromises).then(cssStrings => cssStrings.join(''));
    });
}

function processCss(url, csscontents, phantomLocation) {
    penthouse.DEBUG = true;
    return new Promise(function(resolve, reject){
        console.log('Start Processing');
        penthouse({
            url: url,
            csscontents: csscontents,
            strict: true,
            renderWaitTime: process.env.RENDER_WAIT_TIME ? parseInt(process.env.RENDER_WAIT_TIME) : 2000,
            phantomLocation: phantomLocation
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

module.exports = function getCriticalCssFromSite(url, phantomLocation) {
    return readCssSources(url)
    .then(csscontents => processCss(url, csscontents, phantomLocation))
    .then(criticalCss => new CssMinifier().minify(criticalCss).styles)
    .catch(function(e){
        console.log(e);
        throw e
    });
}