
const getfiles = require("../utils/getfiles.js");

const file_filter = /\.(js|xjs|mjs)$/i;

// type
// - source     : transform to js
// - resource   : copy file as resource
module.exports = function (serviceRoot, options) {
  return { 
    files: getfiles(serviceRoot, file_filter, options && options.recursively, ext => !(/xjs$/i.test(ext))), 
    type: 'mixed' 
  };
};

module.exports.version = "1.0";



