
const path = require("path");
const transformXScript = require("./xscript-transform.js");

const event_prop_map = ['onaccessibility', 'ondevicepermission', 'onload', 'onerror', 'onextendedcommand'];

function isEventProp(name) {
    return event_prop_map.indexOf(name) > -1;
}

function template_xscript(source, script_str) {
    
    var code = '';
    const result = transformXScript(source, script_str);
    if (result)
    {
        const includes = result.includes;
        if (includes && includes.length > 0)
        {
            includes.forEach(include_src => code += `this.addIncludeScript("${source}", "${include_src}");\n`);
        }

        code += `env.registerScript("${source}", function () {
            ${result.code}
        });`;
    }

    return code;
}

function template_envjs (env_props, env_events, env_vars, env_cookies, env_headers, env_adaptors, source_code) {
    return `if (nexacro.Environment)
{
    var env = nexacro._environment = new nexacro.Environment();
    env.on_init = function ()
    {
        ${env_props ? env_props : ''}
    };
    env.on_initEvent = function ()
    {
        ${env_events ? env_events : ''}

    };

    // set implement code at typedefintion.xml.js
    env.loadTypeDefinition = function () {};

    env.on_loadVariables = function ()
    {
        // Variables
        ${env_vars ? env_vars : ''}

        // Cookies
        ${env_cookies ? env_cookies : ''}

        // HTTP Header
        ${env_headers ? env_headers : ''}
    };
	env.on_loadDeviceAdaptors = function ()
	{
        // load device adatpor
        ${env_adaptors ? env_adaptors : ''}

	};

    ${source_code}

    env = null;
}`;
};

// callback: (err, string, dependencies)
module.exports = function (resourcePath, envNode, options, callback) {

  var modules= [];

  const version = envNode.$.version;

  if (version < "2.1")
      return callback(new Error(`${version} is not support environment version. (should >= 2.1)`))

  const environments = envNode.Environment;
  if (!environments || environments.length == 0)
      return callback(new Error(`Cannot found 'environment' information.`));

  const environment = environments[0];

  var init_env_str = '', init_event_str = '';
  if (environment)
  {
    Object.keys(environment.$).forEach(key => {
      if (isEventProp(key)) {
        init_event_str += `this.addEventHandler("${key}", this.${environment.$[key]}, this);\n`;
      } else {
        init_env_str += `this.set_${key}("${environment.$[key]}");\n`;
      }
    });
  }

  var env_vars, env_cookies, env_headers, env_adaptors;

  const script_node = envNode.Script;
  var source_code;
  if (script_node) {
    const base = path.basename(resourcePath);
    const dir = path.dirname(resourcePath);
    const folder = options && options.projectRoot ? path.relative(options.projectRoot, dir) : "";

    const source_uri = folder ? `${folder}/${base}` : `${base}`;
    const script_str = script_node[0]['_'];

    // xscript transform
    source_code = template_xscript(source_uri || "environment.xml", script_str);
  }

  const env_jsstring = template_envjs(
      init_env_str, 
      init_event_str, 
      env_vars, 
      env_cookies, 
      env_headers, 
      env_adaptors, 
      source_code
    );

  return callback(null, env_jsstring, modules);
};

module.exports.version = "1.0";



