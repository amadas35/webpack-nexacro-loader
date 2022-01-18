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

module.exports = getQueryString;

module.exports.version = "1.0";



