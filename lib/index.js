/*
 * Node module wrapper for the PhantomJS script
 */

'use strict'

var fs = require('fs')
var tmp = require('tmp')
tmp.setGracefulCleanup();
var path = require('path')
var spawn = require('child_process').spawn
var apartment = require('apartment')
var cssAstFormatter = require('css')
var osTmpdir = require('os-tmpdir')
var postformatting = require('./postformatting/')
var normalizeCss = require('./normalize-css')
// var fetch = require('node-fetch')

// for phantomjs
var configString = '--config=' + path.join(__dirname, 'phantomjs', 'config.json')
var script = path.join(__dirname, 'phantomjs', 'core.js')

var DEFAULT_VIEWPORT_WIDTH = 1300 // px
var DEFAULT_VIEWPORT_HEIGHT = 900 // px
var DEFAULT_TIMEOUT = 30000 // ms
var DEFAULT_MAX_EMBEDDED_BASE64_LENGTH = 1000 // chars
var DEFAULT_USER_AGENT = 'Penthouse Critical Path CSS Generator'
var TMP_DIR = path.join(osTmpdir(), './critical');
if (!fs.existsSync(TMP_DIR)){
    fs.mkdirSync(TMP_DIR);
}
var DEFAULT_RENDER_WAIT_TIMEOUT = 100
var DEFAULT_BLOCK_JS_REQUESTS = true

var toPhantomJsOptions = function (maybeOptionsHash) {
  if (typeof maybeOptionsHash !== 'object') {
    return [];
  }
  return Object.keys(maybeOptionsHash).map(function (optName) {
    return '--' + optName + '=' + maybeOptionsHash[optName];
  })
}

var clearTempDir = function(debuglog) {
  return new Promise(function(resolve) {
    fs.readdir(TMP_DIR, function(err, files){
      if (err) throw err;
      Promise.all(files.map(function(file) {
        return new Promise(function(resolve) {
          fs.unlink(path.join(TMP_DIR, file), function(err){
            resolve(err ? false: true)
          });
        })
      })).then(function(files){
        var num = files ? files.filter(function(result){return result === false}).length : 0;
        var tot;
        if(num > 0) {
          tot = fs.readdirSync(TMP_DIR).length;
        }
        debuglog([
          'cleared temp directory async',
          (num ? (', ' + num + ' failed') : ''),
          (tot ? (', ' + tot + ' left') : '')
        ].join(''));
        resolve();
      }).catch(function(){
        debuglog('failed clearing temp directory, continue anyway')
        resolve();
      })
    // rimraf(TMP_DIR, function() {
    //   fs.mkdirSync(TMP_DIR);
    //   debuglog('cleared temp directory async')
    //   resolve();
    // });
  });
});
}

var clearTempDirSync = function(debuglog) {
  try {
    var files = fs.readdirSync(TMP_DIR);
    files.forEach(function(file){
      fs.unlinkSync(path.join(TMP_DIR, file))
    })
    debuglog('cleared temp directory sync')
  } catch (e) {
    debuglog('failed clearing temp directory sync, continue anyway')
  }

  // rimraf.sync(TMP_DIR);
  // fs.mkdirSync(TMP_DIR);
  // debuglog('cleared temp directory sync')
}

function penthouseScriptArgs (options, ast, debuglog) {
  // need to annotate forceInclude values to allow RegExp to pass through JSON serialization
  var forceInclude = (options.forceInclude || []).map(function (forceIncludeValue) {
    if (typeof forceIncludeValue === 'object') {
      if(forceIncludeValue.constructor.name === 'RegExp') {
        return { type: 'RegExp', value: forceIncludeValue.source }
      } else if(forceIncludeValue.type === 'RegExp') {
        return { type: 'RegExp', value: forceIncludeValue.value }
      }
    }
    return { value: forceIncludeValue.value || forceIncludeValue }
  })
  if(forceInclude.length) {
    debuglog('Force include: ' + JSON.stringify(forceInclude))
  }
  return [
    options.url || '',
    writeAstToFile(ast, debuglog, options.compress, options.singleFile),
    options.width || DEFAULT_VIEWPORT_WIDTH,
    options.height || DEFAULT_VIEWPORT_HEIGHT,
    JSON.stringify(forceInclude), // stringify to maintain array
    options.userAgent || DEFAULT_USER_AGENT,
    options.renderWaitTime || DEFAULT_RENDER_WAIT_TIMEOUT,
    (typeof options.blockJSRequests !== 'undefined' ? options.blockJSRequests : DEFAULT_BLOCK_JS_REQUESTS),
    m.DEBUG
  ]
}

function fileNameTemplate(prefix, fileName, postfix, seed) {
  return path.join(TMP_DIR, './' + prefix + (fileName || 'temp_file') + seed + postfix);
}

function getTempFileName(options) {
  var postfix = options.compress ? '.zip' : '.txt';
  var prefix = 'critical_';

  if(options.singleFile) {
    for(var i = 0; i < 5; i++) {
      var p = fileNameTemplate(prefix, options.fileNam, postfix, i);
      if (!fs.existsSync(p)) {
          return p;
      }
    }
    return fileNameTemplate(prefix, options.fileNam, postfix, Math.floor(Math.random() * (5)));
  }

  var tmpobj = tmp.fileSync({dir: TMP_DIR, prefix: prefix, postfix: postfix, discardDescriptor : true});
  return tmpobj.name;
}

function writeAstToFile (ast, debuglog, compress, singleFile) {
  // save ast to file
  var tmpName = getTempFileName({compress: compress, singleFile: singleFile, fileName: 'ast'});
  ast = JSON.stringify(ast);
  var zippedContents = compress ? require('./phantomjs/utils/lz').compressToUTF16(ast) : ast;
  try {
    fs.writeFileSync(tmpName, zippedContents)
  } catch (e) {
    debuglog('failed writing ast, retrying...')
    clearTempDirSync(debuglog)
    tmpName = getTempFileName({compress: compress, singleFile: singleFile, fileName: 'fixed_css'});
    fs.writeFileSync(tmpName, zippedContents)
  }
  debuglog(compress ? 'wrote compressed ast file' : 'wrote ast file')
  return tmpName
}

function writeCssToFile(css, debuglog, singleFile) {
  // save css to file
  var tmpName = getTempFileName({singleFile: singleFile, fileName: 'fixed_css'});
  debuglog('writing to a temp file: ' + tmpName);
  fs.writeFileSync(tmpName, css);
  return tmpName
}

var m = module.exports = function (options, rawCallback) { // jshint ignore: line
  var tempFileNames = [];
  var stdOut = ''
  var stdErr = ''
  // debugging
  var START_TIME = Date.now()
  var debuglog = function (msg, isError) {
    if (m.DEBUG) {
      var errMsg = 'time: ' + (Date.now() - START_TIME) + ' | ' + (isError ? 'ERR: ' : '') + msg
      stdErr += errMsg
      console.error(errMsg)
    }
  }

  var callback = function() {
    tempFileNames.forEach(function(fileName){
      try {
        fs.unlinkSync(fileName)
        debuglog('removed temp file successfully')
      } catch (e) {
        if(e.message.indexOf('ENOENT') > -1 ) {
          debuglog('temp file was already removed');
        } else {
          debuglog('failed to remove temp file: ' + fileName)
        }
      }
      debuglog('temp dir file count: ' + fs.readdirSync(TMP_DIR).length);
    })
    rawCallback.apply(this, arguments);
  }

  var clearTempDirIfNeeded = function(ast) {
    if(options.clearTemp) {
      return clearTempDir(debuglog).then(function(){
        return ast;
      })
    } else {
      return Promise.resolve(ast);
    }
  }

  function generateCriticalCss (ast) {
    var debuggingHelp = '',
        cp,
        killTimeout

    var timeoutWait = options.timeout || DEFAULT_TIMEOUT

    var scriptArgs = penthouseScriptArgs(options, ast, debuglog);
    debuglog('Options for criticalCSS script: ' + JSON.stringify(scriptArgs));

    tempFileNames.push(scriptArgs[1]);

    var phantomJsArgs = [configString].concat(toPhantomJsOptions(options.phantomJsOptions))
    phantomJsArgs.push(script)
    phantomJsArgs = phantomJsArgs.concat(scriptArgs)
    var phantomJsBinPath = options.phantomLocation || path.join(require('phantomjs-prebuilt').path.replace(/\\/g, '/'))

    debuglog(phantomJsBinPath)
    cp = spawn(phantomJsBinPath, phantomJsArgs)

    // Errors arise before the process starts
    cp.on('error', function (err) {
      debuggingHelp += 'Error executing penthouse using ' + phantomJsBinPath
      debuggingHelp += err.stack
      err.debug = debuggingHelp
      callback(err)
    })

    cp.stdout.on('data', function (data) {
      stdOut += data
    })

    cp.stderr.on('data', function (data) {
      stdErr += data
      debuglog(String(data))
    })

    cp.on('close', function (code) {
      if (code !== 0) {
        debuggingHelp += 'PhantomJS process closed with code ' + code
      }
    })

    // kill after timeout
    killTimeout = setTimeout(function () {
      var msg = 'Penthouse timed out after ' + timeoutWait / 1000 + 's. '
      debuggingHelp += msg
      stdErr += msg
      cp.kill('SIGTERM')
    }, timeoutWait)

    cp.on('exit', function (code) {
      if (code === 0) {
        // promise purely for catching errors,
        // that otherwise exit node
        new Promise(function (resolve) {
          var finalCss = postformatting(stdOut, {
            maxEmbeddedBase64Length: typeof options.maxEmbeddedBase64Length === 'number' ? options.maxEmbeddedBase64Length : DEFAULT_MAX_EMBEDDED_BASE64_LENGTH
          }, m.DEBUG, START_TIME, options)

          if (finalCss.trim().length === 0) {
            // TODO: this error should surface to user
            debuglog('Note: Generated critical css was empty for URL: ' + options.url)
          } else {
            // remove irrelevant css properties
            finalCss = apartment(finalCss, {
              properties: [
                '(.*)transition(.*)',
                'cursor',
                'pointer-events',
                '(-webkit-)?tap-highlight-color',
                '(.*)user-select'
              ],
              // TODO: move into core phantomjs script
              selectors: [
                '::(-moz-)?selection'
              ]
            })
          }
          callback(null, finalCss)
          resolve()
          return
        })
        .catch(function (err) {
          console.log('caught err', err)
          callback(err)
        })
      } else {
        debuggingHelp += 'PhantomJS process exited with code ' + code
        var err = new Error(stdErr + stdOut)
        err.code = code
        err.debug = debuggingHelp
        err.stdout = stdOut
        err.stderr = stdErr
        callback(err)
      }
      // we're done here - clean up
      clearTimeout(killTimeout)
      // can't rely on that the parent process will be terminated any time soon,
      // need to rm listeners and kill child process manually
      process.removeListener('exit', exitHandler)
      process.removeListener('SIGTERM', sigtermHandler)
      cp.kill('SIGTERM')
    })

    function exitHandler () {
      cp.kill('SIGTERM')
    }
    function sigtermHandler () {
      cp.kill('SIGTERM')
      process.exit(0)
    }
    process.on('exit', exitHandler)
    process.on('SIGTERM', sigtermHandler)
  }

  // function generateAstFromCssPath(cssfilepath) {
  //   return fetch(cssfilepath).then(function(res){
  //     return res.text().then(function(text){
  //       return generateAstFromCssContents(text);
  //     })
  //   })
  // }

  function generateAstFromCssFile(cssfilepath) {
    return new Promise(function(resolve, reject) {
      try {
        var css = fs.readFileSync(cssfilepath, 'utf8');
        debuglog('opened css file')
        resolve(generateAstFromCssContents(css));
        return;
      } catch (e) {
        reject(e.message);
        return;
      }
    });
  }

  function fixKeyframes(csscontents) {
    return csscontents.replace(/keyframes +"([^{}\"]*?)"/g, 'keyframes $1');
  }

  function generateAstFromCssContents(csscontents) {
    // read the css and parse the ast
    // if errors, normalize css and try again
    // only then pass css to penthouse
    return new Promise(function (resolve, reject) {
      var css = csscontents;

      css = fixKeyframes(css);

      var ast = cssAstFormatter.parse(css, { silent: true })
      var parsingErrors = ast.stylesheet.parsingErrors.filter(function (err) {
        // the forked version of the astParser used fixes these errors itself
        return err.reason !== 'Extra closing brace'
      })
      if (parsingErrors.length === 0) {
        debuglog('parsed ast (without errors)')
        resolve(ast)
        return
      }

      // had breaking parsing errors
      // NOTE: only informing about first error, even if there were more than one.
      var parsingErrorMessage = parsingErrors[0].message
      if (options.strict === true) {
        reject(parsingErrorMessage)
        return
      }

      debuglog('Failed ast formatting css \'' + parsingErrorMessage + '\': ')

      var cssfilename = writeCssToFile(css, debuglog, options.singleFile);

      tempFileNames.push(cssfilename);

      var normalizeScriptArgs = [
        options.url || '',
        cssfilename || '',
        options.userAgent || DEFAULT_USER_AGENT,
        m.DEBUG
      ]
      normalizeCss.DEBUG = m.DEBUG;
      normalizeCss(
        normalizeScriptArgs,
        function (err, normalizedCss) {
          debuglog('normalized css: ' + normalizedCss.length)
          ast = cssAstFormatter.parse(normalizedCss, { silent: true })
          debuglog('parsed normalised css into ast')
          var parsingErrors = ast.stylesheet.parsingErrors.filter(function (err) {
            // the forked version of the astParser used fixes these errors itself
            return err.reason !== 'Extra closing brace'
          })
          if (parsingErrors.length > 0) {
            debuglog('..with parsingErrors: ' + parsingErrors[0].reason)
          }
          resolve(ast)
          return
        },
        options.phantomLocation
      )
    })
  }

  var astPromise = options.csscontents ? generateAstFromCssContents(options.csscontents) : generateAstFromCssFile(options.css);

  return astPromise
  .then(clearTempDirIfNeeded)
  .then(generateCriticalCss)
  .catch(callback)
}
