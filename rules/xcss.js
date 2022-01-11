
const path = require("path");


// callback: (err, string, dependencies)
module.exports = function (resourcePath, xcssNode, options, callback) {

  var modules= [];

  const version = xcssNode.$.version;

  if (version < "1.0")
      return callback(new Error(`${version} is not support xcss version. (should >= 1.0)`))

  const css_str = xcssNode._;
  if (!css_str)
      return callback(new Error(`Cannot found css string.`));

  return callback(null, css_str, modules);
};

module.exports.version = "1.0";



