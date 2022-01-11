const path = require("path");
const fs = require("fs");

function checkRaw (checker, extname) {
  if (checker === undefined || checker === null)
    return false;

  if (typeof checker == 'boolean')    return checker;
  if (typeof checker === 'function')  return checker(extname);
  if (typeof checker === "object") {
    if (checker.constructor == RegExp)  return checker.test(extname);
  }

  return Boolean(isRaw);
}

function getFiles(root, filter, bRecursively, rawChecker) {

  var files = [], dirs = [];

  const entries = fs.readdirSync(root, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.isDirectory()) dirs.push(entry.name);
    else if (entry.isFile()) 
    {
        const ext = path.extname(entry.name);
        if (!filter || (filter && filter.test(ext)))
        {
          var filePath = path.resolve(root, entry.name);
          if (checkRaw(rawChecker, ext))
            filePath += '?raw';

          files.push(filePath);
        }
    }
  });

  if (bRecursively)
  {
    dirs.forEach(dir => {
        const subpath = `${root}${path.sep}${dir}`;
        files = files.concat(getFiles(subpath, filter, bRecursively, rawChecker));
    });
  }
  
  return files;
}

module.exports = getFiles;

module.exports.version = "1.0";



