
const path = require("path");  
const getQueryString = require("../utils/getquerystring.js");

// callback: (err, string, dependencies)
module.exports = function (resourcePath, project, options, callback) {

  var modules= [];
  const version = project.$.version;

  if (version < "2.1")
    return callback(new Error(`${version} is not support XPRJ version. (should >= 2.1)`))

  if (!project.elements || project.elements.length == 0)
    return callback(new Error(`Cannot found 'environment.xml' setting.`));

  // get environment definition from xprj
  const envs = project.elements.filter(element => element.name === "EnvironmentDefinition");
  if (!envs || envs.length == 0)
      return callback(new Error(`Cannot found 'environment.xml' setting.`));

  envs.forEach(env => modules.push(`./${env.$.url}${getQueryString({"usebase":true, "ext":"js"})}`));

  // get type definition from xprj
  const typedef = project.elements.find(element => element.name === "TypeDefinition");
  if (!typedef)
    return callback(new Error(`Cannot found 'typedefinition.xml' setting.`));

  modules.push(`./${typedef.$.url}${getQueryString({"usebase":true, "ext":"js"})}`);

  // get appvariables file from xprj
  const appvars = project.elements.find(element => element.name === "AppVariables");
  if (appvars)
  {
    modules.push(`./${appvars.$.url}${getQueryString({"usebase":true, "ext":"js"})}`);
  }
  
  // get AppInfos from xprj
  const appinfos = project.elements.find(element => element.name === "AppInfos");
  if (!appinfos || !appinfos.elements || appinfos.elements.length == 0)
      return callback(new Error(`Cannot found 'AppInfo' setting.`));

  appinfos.elements.forEach(element => modules.push(`./${element.$.url}${getQueryString({"usebase":true, "ext":"js"})}`));

  return callback(null, JSON.stringify(project), modules);
};

module.exports.version = "1.0";



