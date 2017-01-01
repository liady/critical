var getCriticalCss = require('./src/getCriticalCss.js');

function isAWSHosted() {
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || undefined;
    return functionName !== undefined;
}
exports.handler = function(event, context, callback) {
    var url = event.url;
    var options = {
      useFFRemoverFix: event.useFFRemoverFix,
      renderWaitTime: event.renderWaitTime,
      skipFFRemove: event.skipFFRemove,
      debug: event.debug
    }
    getCriticalCss(url, options).then(criticalCss => {
        callback(null, {value: criticalCss});
    }).catch(err => {
        callback(err)
    })
}