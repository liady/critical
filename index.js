var getCriticalCss = require('./src/getCriticalCss.js');
var PhantomJSInstaller = require('./phantomInstaller.js');
var phantomJsInstaller = new PhantomJSInstaller();

function isAWSHosted() {
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || undefined;
    return functionName !== undefined;
}
exports.handler = function(event, context, callback) {
    var url = event.url;
    // var phantomjsLocation = isAWSHosted() ? phantomJsInstaller.install(true) : Promise.resolve();
    var options = {
      useFFRemoverFix: event.useFFRemoverFix,
      renderWaitTime: event.renderWaitTime,
    }
    getCriticalCss(url, options).then(criticalCss => {
        callback(null, {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({value: criticalCss})
        });
    }).catch(err => {
        callback(err)
    })
}