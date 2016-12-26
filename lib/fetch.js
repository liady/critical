var path = require('path')
var childProcess = require('child_process')
var spawn = require('child_process').spawn
var phantomjs = require('phantomjs-prebuilt')
var phantomJsBinPath = phantomjs.path

var configString = '--config=' + path.join(__dirname, 'phantomjs', 'config.json')
var script = path.join(__dirname, 'phantomjs', 'fetchLinks.js')

module.exports = function(url, callback) {
    var stdOut = ''
    var stdErr = ''
    var debuggingHelp = ''

    var phantomJsArgs = [configString, script, url]
console.log(phantomJsBinPath, phantomJsArgs)
    var cp = spawn(phantomJsBinPath, phantomJsArgs)

    // Errors arise before the process starts
    cp.on('error', function (err) {
      debuggingHelp += 'Error executing penthouse using ' + phantomJsBinPath
      debuggingHelp += err.stack
      err.debug = debuggingHelp
      callback(err)
    })

    cp.stdout.on('data', function (data) {
        console.log(data);
      stdOut += data
    })

    cp.stderr.on('data', function (data) {
        console.log(data);
      stdErr += data
    })

    cp.on('close', function (code) {
      if (code !== 0) {
        debuggingHelp += 'PhantomJS process closed with code ' + code
      }
    })

    cp.on('exit', function (code) {
      if (code === 0) {
        callback(null, stdOut)
      } else {
        debuggingHelp += 'PhantomJS process exited with code ' + code
        var err = new Error(stdErr + stdOut)
        err.code = code
        err.debug = debuggingHelp
        err.stdout = stdOut
        err.stderr = stdErr
        callback(err)
      }
  });
}