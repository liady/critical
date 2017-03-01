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

function readCssSources(url, options) {
    var parsedUrl = url.split('?')[0];
    var log = (isTrue(options.debug) || isTrue(process.env.DEBUG)) ? console.log.bind(console) : () => {}
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
                    log('Found Link: ' + linkHref)
                    hrefs[linkHref] = true;
                    cssStringPromises.push(getText(linkHref));
                }
            } else if($el.text()) {
                log('Found Style Element: ' + $el.attr('id'))
                cssStringPromises.push(Promise.resolve($el.text()));
            }
        });

        return Promise.all(cssStringPromises).then(cssStrings => cssStrings.join(''));
    });
}

function processCss(url, csscontents, options) {
    var log = (isTrue(options.debug) || isTrue(process.env.DEBUG)) ? console.log.bind(console) : () => {}
    penthouse.DEBUG = isTrue(options.debug) || isTrue(process.env.DEBUG)
    var options = options || {};
    return new Promise(function(resolve, reject){
        log('Start Processing');
        penthouse({
            url: url,
            csscontents: csscontents,
            strict: booleanValue(options.strict, true),
            renderWaitTime: asNumber(options.renderWaitTime, 300),
            timeout: asNumber(options.timeout),
            width: asNumber(options.width),
            height: asNumber(options.height),
            phantomLocation: options.phantomLocation,
            useFFRemoverFix: true,
            skipFFRemove: isTrue(options.skipFFRemove),
            forceInclude: options.forceInclude || [],
            clearTemp: booleanValue(options.clearTemp, false)

        }, function(err, criticalCss) {
            if (err) {
                log('error:' + err)
                // handle error
                reject(err);
            }
            log('End Processing');
            resolve(criticalCss);
        });
    })
}

function isTrue(exp) {
    return !!exp && (('' + exp).toLowerCase() == 'true');
}

function booleanValue(exp, defaultValue) {
    if(typeof exp === 'undefined') {
        return defaultValue;
    } else {
        if(!exp || (('' + exp).toLowerCase() == 'false')) {
            return false;
        } else if((('' + exp).toLowerCase() == 'true')) {
            return true;
        }
        return defaultValue;
    }
}

function asNumber(exp, defaultValue) {
    return exp ? parseInt(exp) : defaultValue;
}

module.exports = function getCriticalCssFromSite(url, options) {
    return readCssSources(url, options)
    .then(rawcontents => new CssMinifier({restructuring: false}).minify(rawcontents).styles)
    .then(csscontents => processCss(url, csscontents, options))
    .then(criticalCss => new CssMinifier().minify(criticalCss).styles)
    .catch(function(e){
        console.log(e);
        throw e
    });
}