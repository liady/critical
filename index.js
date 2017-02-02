var getCriticalCss = require('./src/getCriticalCss.js');

function isAWSHosted() {
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || undefined;
    return functionName !== undefined;
}
exports.handler = function(event, context, callback) {
    var url = event.url;
    var options = event; // we can omit unwanted keys here
    getCriticalCss(url, options).then(criticalCss => {
        callback(null, {value: criticalCss});
    }).catch(err => {
        callback(err, {err: err})
    })
}