'use strict';

const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const glob = require('glob-all');
const servicePath = path.resolve('./');
const zipFileName = 'critical.zip';

function zipDirectory(exclude, include) {
  const patterns = ['**'];

  exclude.forEach((pattern) => {
    if (pattern.charAt(0) !== '!') {
      patterns.push(`!${pattern}`);
    } else {
      patterns.push(pattern.substring(1));
    }
  });

  // push the include globs to the end of the array
  // (files and folders will be re-added again even if they were excluded beforehand)
  include.forEach((pattern) => {
    patterns.push(pattern);
  });

  const zip = archiver.create('zip');

  const artifactFilePath = path.join(
    servicePath,
    zipFileName
  );

  const output = fs.createWriteStream(artifactFilePath);

  output.on('open', () => {
    zip.pipe(output);

    const files = glob.sync(patterns, {
      cwd: servicePath,
      dot: true,
      silent: true,
      follow: true,
    });

    files.forEach((filePath) => {
      const fullPath = path.resolve(
        servicePath,
        filePath
      );

      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory(fullPath)) {
        zip.append(fs.readFileSync(fullPath), {
          name: filePath,
          mode: '33279', //stats.mode,
        });
      }
    });

    zip.finalize();
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(artifactFilePath));
    zip.on('error', (err) => reject(err));
  });
}


zipDirectory([],[]).then(result => console.log(result))