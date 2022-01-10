const path = require("path");
const fs = require("fs");

function getFiles(root, filter, bRecursively) {

  var files = [], dirs = [];

  const entries = fs.readdirSync(root, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.isDirectory()) dirs.push(entry.name);
    else if (entry.isFile()) 
    {
        const ext = path.extname(entry.name);
        if (!filter || (filter && filter.test(ext)))
            files.push(path.resolve(root, entry.name));
    }
  });

  if (bRecursively)
  {
    dirs.forEach(dir => {
        const subpath = `${root}${path.sep}${dir}`;
        files = files.concat(getFiles(subpath, filter, bRecursively));
    });
  }
  
  return files;
}

module.exports = getFiles;

module.exports.version = "1.0";



