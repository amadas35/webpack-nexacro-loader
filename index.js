
const path = require("path");  
//const parseString = require('xml2js').parseString;
const xml2js = require('xml-js').xml2js;
const getdirs = require("./utils/getdirs.js");

const default_rule = {
    'project': './rules/xprj.js',
    'env': './rules/env.js',
    'typedefinition': './rules/typedefinition.js',
    'appvariables': './rules/appvariables.js',
    'xcss': './rules/xcss.js',
    'fdl': './rules/xfdl.js',
};

function emitFileToOutDirs(loader, outdirs, filename, content) {
  if (!outdirs || outdirs.length == 0)
    return filename;

  var output_filepath;
  outdirs.forEach(target => {
    const target_path = path.join(target, filename);
    loader.emitFile(target_path, content);
    output_filepath = target_path;
  });

  return output_filepath;
}

module.exports = async function(text) {
    var callback = this.async();
    this.cacheable && this.cacheable();
    var options = this.getOptions();
    var template_rule = Object.assign({}, default_rule);

    console.log(`> load ${this.resourcePath}`);

    const path_info = path.parse(this.resourcePath);

    var should_has_exports = false, output_relative_path = '.';
    if (options) {
        should_has_exports = (options.type == "export");

        if (options.projectRoot) {
          const rel_path = path.relative(options.projectRoot, path_info.dir);
          if (rel_path !== '') output_relative_path = rel_path;
        }

        if ('rules' in options)
        {
            const rules_opt = options['rules'];
            const rules_keys = Object.keys(rules_opt);
            rules_keys.forEach(key => template_rule[key.toLocaleLowerCase()] = rules_opt[key]);
        }
    }

    const input_url = new URL(this.resource);
    const file_params = new URLSearchParams(input_url.searchParams);

    const param_root      = file_params.get('root');
    const param_dir       = file_params.get('dir');
    const param_recursive = file_params.has('rdir') ? JSON.parse(file_params.get('rdir').toLowerCase()) : false;
    const param_prefix    = file_params.get('prefix');
    const param_usebase   = file_params.has('usebase') ? JSON.parse(file_params.get('usebase').toLowerCase()) : undefined;
    const param_ext       = file_params.get('ext');
    const israw           = file_params.has('raw');

    const default_ext     = israw ? path_info.ext :'.js';
    const default_name    = (israw || param_usebase === false) ? path_info.name : path_info.base;

    const emit_fileext  = `${param_ext ? ('.'+param_ext) : default_ext}`;
    const emit_filename = `${param_prefix ? param_prefix : ''}${param_usebase ? path_info.base : default_name}${emit_fileext}`;

    var output_dirs = [], emit_filepath = output_relative_path;
    if (param_root)
      emit_filepath = path.join(output_relative_path, param_root);

    if (param_dir) {
      const absolute_target_path = path.resolve(path_info.dir, param_root ? param_root : output_relative_path);
      const target_dirs = getdirs(absolute_target_path, param_dir === "*" ? undefined : param_dir, param_recursive);
      target_dirs.forEach(dir => {
        const rel_path = path.relative(path_info.dir, dir);
        output_dirs.push(path.join(output_relative_path, rel_path));                    
      });
    }
    else {
      output_dirs.push(emit_filepath);
    }

    if (israw)
    {
      // copy file
      const output_filepath = emitFileToOutDirs(this, output_dirs, emit_filename, text);
      callback(null, output_filepath);
    }
    else {
      try {
        const parse_option = {
          compact: false,
          ignoreDeclaration: true,
          ignoreInstruction: true,
          ignoreComment: true,
          ignoreDoctype: true,
          attributesKey: '$',
          textKey: '_',
          cdataKey: '_'
        }

        var generated, is_inline = false;
        var result = xml2js(text, parse_option);

        if (!result || !result.elements || result.elements.length == 0) {
          return callback(new Error(`unknown file '${self.resourcePath}'`));
        }

        const root_element = result.elements.find(element => element.type === "element");
        if (!root_element) {
          return callback(new Error(`unknown file '${self.resourcePath}'`));
        }

        const root_name = root_element.name;
        const rule_names = Object.keys(template_rule);

        const selected_rule = rule_names.find(name => root_name.toLocaleLowerCase() === name);
        if (selected_rule) {
          const rule_path = path.resolve(__dirname, template_rule[selected_rule]);
          const rule_loader = require(rule_path);

          var dependencies_to_import = [], proc_error;
          rule_loader(this.resourcePath, root_element, options, (errobj, proc_result, dependencies) => {
            if (errobj) {
              proc_error = errobj;
              return;
            }

            generated = proc_result;
            dependencies_to_import = dependencies;
          });

          if (proc_error) {
            return callback(proc_error);
          }

          if (dependencies_to_import) {
            const dep_cnt = dependencies_to_import.length;

            for (var dep_idx=0;dep_idx<dep_cnt;dep_idx++) {
                const dep_url = dependencies_to_import[dep_idx];
                const imported = await this.importModule(dep_url);
            }
          }
        }
        else {
          generated = JSON.stringify(result, null, 2);
        }        

        if (should_has_exports && generated)
          generated = "module.exports=" + generated;

        if (is_inline && generated) {
          callback(null, generated);
        }
        else if (generated) {
          const output_filepath = emitFileToOutDirs(this, output_dirs, emit_filename, generated);
          callback(null, output_filepath);
        }
        else {
          callback(null, path.join(emit_filepath, emit_filename));
        }
      }
      catch (err) {
        return callback(err);
      }
    }
};
