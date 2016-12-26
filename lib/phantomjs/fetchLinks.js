var system = require('system')
var args = system.args;
var page = require('webpage').create();
var stdout = system.stdout;
stdout.write('tets');
page.open(args[1], function(status) {
    stdout.write('tets');
    // list all the a.href links in the hello kitty etsy page
    var links = page.evaluate(function() {
        return [].map.call(document.querySelectorAll('link[rel=stylesheet], style'), function(el) {
            return el.getAttribute('href') || el.textContent;
        });
    });
    stdout.write('tets');
    stdout.write(links.join('\n'));
    phantom.exit();
});