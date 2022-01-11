const path = require("path");
const fs = require("fs");

function getDirs(root, filter, bRecursively) {

  var dirs = [], filtered = [];

  const entries = fs.readdirSync(root, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.isDirectory()) 
    {
      if (!filter || (filter && filter.test(entry.name)))
        filtered.push(path.resolve(root, entry.name));
      
      if (bRecursively)
        dirs.push(entry.name);
    }
  });

  if (bRecursively)
  {
    dirs.forEach(dir => {
        const subpath = `${root}${path.sep}${dir}`;
        filtered = filtered.concat(getDirs(subpath, filter, bRecursively));
    });
  }
  
  return filtered;
}

module.exports = getDirs;

module.exports.version = "1.0";



