const getfiles = require("../utils/getfiles.js");

const file_filter = null;

// type
// - source     : transform to js
// - resource   : copy file as resource
module.exports = function (serviceRoot, options) {

  var query = 'raw';
  if (options) {
    if (options.prefix === "xcssrc") {
      query = function (ext) {
        if (/xcss$/i.test(ext))
          //return {"appendext":"css", "target": "../_theme_", "target_filter": "", "prefix": "xcssrc_"};
          return {"root": "../_theme_/", "dir": "*", "prefix": "xcssrc_", "usebase": false, "ext": "css"};
        else 
          return "raw";
      };
    }
    else if (options.prefix === "theme") {
      query = function (ext) {
        if (/xcss$/i.test(ext))
          //return "appendext=css";
          return {"usebase": false, "ext": "css"};
        else 
          return "raw";
      };
    }
  }

  return { 
    files: getfiles(serviceRoot, file_filter, options && options.recursively, query), 
    type: 'mixed' 
  };
};

module.exports.version = "1.0";



