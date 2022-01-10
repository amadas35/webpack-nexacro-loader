
const getfiles = require("./getfiles.js");

const file_filter = /\.xfdl$/i;

// type
// - source     : transform to js
// - resource   : copy file as resource
// - url        : url only, no generate
module.exports = function (serviceRoot, options) {
  return { files: getfiles(serviceRoot, file_filter, options && options.recursively), type: 'source' };
};

module.exports.version = "1.0";



