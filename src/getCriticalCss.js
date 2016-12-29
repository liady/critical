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

function processCss(url, csscontents, options) {
    penthouse.DEBUG = isTrue(options.debug) || isTrue(process.env.DEBUG)
    var options = options || {};
    return new Promise(function(resolve, reject){
        console.log('Start Processing');
        penthouse({
            url: url,
            csscontents: csscontents,
            strict: true,
            renderWaitTime: options.renderWaitTime ? parseInt(options.renderWaitTime) : 300,
            phantomLocation: options.phantomLocation,
            useFFRemoverFix: options.useFFRemoverFix == undefined ? true : isTrue(options.useFFRemoverFix),
            skipFFRemove: isTrue(options.skipFFRemove)
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

function isTrue(exp) {
    return !!exp && (('' + exp).toLowerCase() == 'true');
}

module.exports = function getCriticalCssFromSite(url, options) {
    return readCssSources(url)
    .then(csscontents => processCss(url, csscontents, options))
    .then(criticalCss => new CssMinifier().minify(criticalCss).styles)
    .catch(function(e){
        console.log(e);
        throw e
    });
}