
const path = require("path");


// callback: (err, string, dependencies)
module.exports = function (resourcePath, xcssNode, options, callback) {

  var modules= [];

  const version = xcssNode.$.version;

  if (version < "1.0")
      return callback(new Error(`${version} is not support xcss version. (should >= 1.0)`))

  if (!xcssNode.elements || xcssNode.elements.length == 0)
    return callback(new Error(`Cannot found css data.`));

  const cssData = xcssNode.elements.find(element => element.type === 'cdata');
  if (!cssData)
      return callback(new Error(`Cannot found css data.`));

  return callback(null, cssData['_'], modules);
};

module.exports.version = "1.0";



