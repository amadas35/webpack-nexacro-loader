
const getfiles = require("../utils/getfiles.js");

const file_filter = null;

// type
// - source     : transform to js
// - resource   : copy file as resource
module.exports = function (serviceRoot, options) {
  return { files: getfiles(serviceRoot, file_filter, options && options.recursively, "raw"), type: 'resource' };
};

module.exports.version = "1.0";



