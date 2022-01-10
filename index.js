
const path = require("path");  
var parseString = require('xml2js').parseString;

const regexp_raw = /\?\braw\b/i;
const default_rule = {
    'project': './rules/xprj.js',
    'env': './rules/env.js',
    'typedefinition': './rules/typedefinition.js',
    'appvariables': './rules/appvariables.js',
};

module.exports = function(text) {
    var callback = this.async();
    this.cacheable && this.cacheable();
    var options = this.getOptions();
    var template_rule = Object.assign({}, default_rule);

    console.log(`> load ${this.resource}`);

    const res_base = path.basename(this.resourcePath);
    const res_dir = path.dirname(this.resourcePath);

    var should_has_exports = false, output_root = '.';
    if (options) {
        should_has_exports = (options.type == "export");

        if (options.projectRoot) {
          const rel_path = path.relative(options.projectRoot, res_dir);
          if (rel_path !== '') output_root = rel_path;
        }

        if ('rules' in options)
        {
            const rules_opt = options['rules'];
            const rules_keys = Object.keys(rules_opt);
            rules_keys.forEach(key => template_rule[key.toLocaleLowerCase()] = rules_opt[key]);
        }
    }

    if (regexp_raw.test(this.resourceQuery))
    {
      // copy file
      const output_filename = `${output_root}${path.sep}${res_base}`;
      this.emitFile(output_filename, text);
      callback(null, output_filename);
    }
    else
    {
      const output_filename = `${output_root}${path.sep}${res_base}.js`;

      var self = this;
      parseString(text, options, async function(err, result) {      
        if (err) return callback(err);

        var generated, is_inline = false;

        const root_tags = Object.keys(result);
        const rule_names = Object.keys(template_rule);

        const root_tag_cnt = root_tags.length;
        if (root_tag_cnt == 0)
            return callback(new Error(`unknown file '${self.resource}'`));

        for (var idx = 0;idx<root_tag_cnt;idx++) {

            const tagname = root_tags[idx];
            const rule_name = rule_names.find(name => tagname.toLocaleLowerCase() === name);
            if (rule_name)
            {
              const rule_path = path.resolve(__dirname, template_rule[rule_name]);
              const rule_loader = require(rule_path);

              var dependencies_to_import = [];
              rule_loader(self.resourcePath, result[tagname], options, (errobj, proc_result, dependencies) => {
                if (errobj)
                  return callback(err);

                generated = proc_result;
                dependencies_to_import = dependencies;
              });

              if (dependencies_to_import) {
                const dep_cnt = dependencies_to_import.length;
                //console.log(`>> dependancies: ${dependencies_to_import}`);
                for (var dep_idx=0;dep_idx<dep_cnt;dep_idx++) {
                    const dep_url = dependencies_to_import[dep_idx];
                    const imported = await self.importModule(dep_url);
                }
              }
            }
            else
            {
              generated = JSON.stringify(result);  
            }
        }

        if (should_has_exports && generated)
          generated = "module.exports=" + generated;

        if (is_inline && generated) {
          callback(null, generated);
        }
        else {
          if (generated) {
              self.emitFile(output_filename, generated);
          }

          callback(null, output_filename);
        }
      });
    }
};

module.exports.raw = true;


