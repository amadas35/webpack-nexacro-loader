
const path = require("path");  
const getQueryString = require("../utils/getquerystring.js");

// callback: (err, string, dependencies)
module.exports = function (resourcePath, project, options, callback) {

  var modules= [];
  const version = project.$.version;

  if (version < "2.1")
      return callback(new Error(`${version} is not support XPRJ version. (should >= 2.1)`))

  const envs = project.EnvironmentDefinition;
  if (!envs || envs.length == 0)
      return callback(new Error(`Cannot found 'environment.xml' setting.`));

  envs.forEach(env => modules.push(`./${env.$.url}${getQueryString({"usebase":true, "ext":"js"})}`));

  const typedefs = project.TypeDefinition;
  if (!typedefs || typedefs.length == 0)
    return callback(new Error(`Cannot found 'typedefinition.xml' setting.`));

  typedefs.forEach(typedef => modules.push(`./${typedef.$.url}${getQueryString({"usebase":true, "ext":"js"})}`));

  const appvars = project.AppVariables;
  if (appvars && appvars.length > 0)
  {
    appvars.forEach(appvar => modules.push(`./${appvar.$.url}${getQueryString({"usebase":true, "ext":"js"})}`));
  }
  
  const appinfos = project.AppInfos;
  if (!appinfos || appinfos.length == 0)
    return callback(new Error(`Cannot found 'AppInfo' setting.`));

  appinfos.forEach(element => modules.push(`./${element.AppInfo[0].$.url}${getQueryString({"usebase":true, "ext":"js"})}`));

  return callback(null, JSON.stringify(project), modules);
};

module.exports.version = "1.0";



