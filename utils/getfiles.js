const path = require("path");
const fs = require("fs");

function getQueryString (query, extname) {
  if (query === undefined || query === null)
    return "";

  var params = query;
  if (typeof query === 'function')  params = query(extname);
  if (typeof params == 'string')    
    return params.length > 0 ? `?${params}` : '';

  if (typeof params === "object") {
    const urlParams = new URLSearchParams(params);
    return `?${urlParams.toString()}`;
  }

  return "";
}

function getFiles(root, filter, bRecursively, query) {

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
          filePath += getQueryString(query, ext);
          files.push(filePath);
        }
    }
  });

  if (bRecursively)
  {
    dirs.forEach(dir => {
        const subpath = `${root}${path.sep}${dir}`;
        files = files.concat(getFiles(subpath, filter, bRecursively, query));
    });
  }
  
  return files;
}

module.exports = getFiles;

module.exports.version = "1.0";



