
const path = require("path");

function template_services_to_js (services, padleft) {
  if (!services || services.length === 0)
    return '';
  
  var code = '';

  services.forEach(service => code += `${padleft}nexacro._addService("${service.$.prefixid}", "${service.$.type}", "${service.$.url || ""}", "${service.$.cachelevel || ""}", ${service.$.codepage ? service.$.codepage : null}, "${service.$.language || ""}", "${service.$.version || ""}", "${service.$.communicationversion || ""}");\n`);

  return code;
}

function template_types_to_js (types, padleft) {
  if (!types || types.length === 0)
    return '';
  
  var code = '';

  types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));

  return code;
}

function template_typedefinition_to_js (url, service_defs, comp_root, theme_root, class_defs) {

  const left_whitespace = '\t';

  return `if (nexacro._environment)
{
  var env = nexacro._environment;

  // set implement code at typedefintion.xml.js
  env.loadTypeDefinition = function () 
  {
    nexacro._setTypeDefinitionURL("${url}");

${template_services_to_js(service_defs, left_whitespace.padEnd(2, '\t'))}
    nexacro._component_uri = nexacro._arg_compurl || "${comp_root}";
    nexacro._theme_uri = "${theme_root}";

    // load components
    var registerclass = [
${template_types_to_js(class_defs, left_whitespace.padEnd(3, '\t'))}
    ];
    nexacro._addClasses(registerclass);
  };
  env = null;
}`;
};

function loadFilesOfService (service, rootPath) {

  if (!service) return;
  
  const type = service.$.type;
  console.log(`> Find files of '${service.$.prefixid}' service.`)

  try {
    const service_loader = require(`../service/${type.toLowerCase()}.js`);
    const loadinfo = service_loader(rootPath, {type: type, prefix: service.$.prefixid, recursively: JSON.parse(service.$.include_subdir)});

    if (loadinfo && loadinfo.files) {
      return loadinfo.files;
    }
    else{
      // do nothing
      return;
    }
  }
  catch (e) {
    console.warn(`  Unexpected service type '${type}'. (service root:${rootPath})`);
    console.log(e.message);
  }

}

const default_comp_uri =  "./nexacrolib/component/";
const default_theme_uri = "./_resource_/_theme_/";

// callback: (err, string, dependencies)
module.exports = function (resourcePath, typedefNode, options, callback) {

  const version = typedefNode.$.version;

  if (version < "3.0")
      return callback(new Error(`${version} is not support typedefinition version. (should >= 3.0)`));

  if (!typedefNode.elements || typedefNode.elements.length == 0)
    return callback(new Error(`Cannot found 'typedefinition' information.`));
  
  // dependency modules info
  const modulesNode = typedefNode.elements.find(element => element.name === "Modules");
  if (!modulesNode || !modulesNode.elements || modulesNode.elements.length == 0)
    return callback(new Error(`Cannot found 'Modules' information in ${resourcePath}.`));

  // [TODO] generate bundle info and script link from modules info.

  // component type definition
  var components;
  const componentsNode = typedefNode.elements.find(element => element.name === "Components");
  if (componentsNode)
    components = componentsNode.elements || [];

  // service info
  var services;
  const servicesNode = typedefNode.elements.find(element => element.name === "Services");
  if (servicesNode)
  {
    services = servicesNode.elements || [];
  }

  // custom proptocol definition
  var protocols;
  const protocolsNode = typedefNode.elements.find(element => element.name === "Protocols");
  if (protocolsNode)
  {
    protocols = protocolsNode.elements || [];
  }
  
  // update info --> for nre bootstrap
  var update;
  const updateNode = typedefNode.elements.find(element => element.name === "Update");
  if (updateNode)
  {
    update = [];
  }

  // resolve url
  const base = path.basename(resourcePath);
  const dir = path.dirname(resourcePath);
  const folder = options && options.projectRoot ? path.relative(options.projectRoot, dir) : "";

  const source_uri = folder ? `${folder}/${base}` : `${base}`;
  
  const typedef_jsstring = template_typedefinition_to_js(source_uri, services, default_comp_uri, default_theme_uri, components);

  // load files from service info
  var modules = [];
  const resourceDir = path.dirname(resourcePath);
  services.forEach(service => {
    const serviceRoot = path.resolve(resourceDir, service.$.url);
    const filesToLoad = loadFilesOfService(service, serviceRoot); 
    if (filesToLoad && filesToLoad.length > 0)
    {
      modules = modules.concat(filesToLoad);
    }
  });

  return callback(null, typedef_jsstring, modules);
};

module.exports.version = "1.0";



