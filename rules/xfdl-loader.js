
const path = require("path");  
var loaderUtils = require('loader-utils');
var parseString = require('xml2js').parseString;

const template_xprj = (loader, context, project) => {
    const version = project.$.version;

    if (version < "2.1")
    {
        //console.error(`${version} is not support XPRJ version`);
        loader.emitError(`${version} is not support XPRJ version. (should >= 2.1)`);
        return;
    }

    const env = project.EnvironmentDefinition;
    if (!env || env.length == 0)
    {
        loader.emitError(`Cannot found 'environment.xml' setting.`);
        return;
    }
    //loader.importModule(`./${env[0].$.url}`);

    const typedef = project.TypeDefinition;
    if (!typedef || typedef.length == 0)
    {
        loader.emitError(`Cannot found 'typedefinition.xml' setting.`);
        return;
    }
    //loader.importModule(`./${typedef[0].$.url}`);

    if (project.AppVariables)
    {
        const url = `./${project.AppVariables[0].$.url}`;
        //loader.importModule(url);
    }

    if (project.AppInfos)
    {
        const url = `./${project.AppInfos[0].AppInfo[0].$.url}`;
        //loader.loadModule(url, (err, source, sourceMap, module) => {
            //generated = "module.exports=" + source;
        
        //    console.log(`module loaded: ${err}, ${source}`);
        //});
        //const result = loader.importModule(url);
        loader.resolve(context, url, (err, result) => require(result));
    }

    return '';
};

const template_xfdljs = (filename, form_attrs, object, ui, layout, bind, trigger, preload, script, event) => {
    return `(function(){
    return function()		
    {		
        if (!this._is_form)		
            return;		
                        
        var obj = null;	
        this.on_create = function()
        {
            // form properties
            ${form_attrs}

            // initialize objects
            ${object}

            // initialize ui components
            ${ui}

            // layout functions
            ${layout}

            // bind items
            ${bind}

            // trigger items
            ${trigger}
        };

        this.loadPreloadList = function()
        {
            ${preload}
        };

        this.registerScript("${filename}", function() {
            ${script}
        });

        // events
        this.on_initEvent = function()
        {
            ${event}
        };

        this.loadIncludeScript("${filename}");
        this.loadPreloadList();

        // Remove Reference
        obj = null;
    };
})()`;
};

function template_form_attr (info) {
    const mapTagtoProp = {
        'id': 'name',
        'titletext': 'title'
    }

    const positionProps = [
        'left', 'top', 'right', 'bottom',
        'width', 'height', 'minwidth', 'maxwidth', 'minheight', 'maxheight'
    ];

    const left_whitespace = '\t\t\t';

    let attr_keys = Object.keys(info);
    var positon_str = `if (Form == this.constructor) {
            this._setPosition(${info.width}, ${info.height});
        }`;

    let filtered_keys = attr_keys.filter(key => positionProps.indexOf(key) === -1);

    // check metainfo
    // - is property
    // - is event
    // - is style property
    var setter_str = filtered_keys.map(key => (
        `this.set_${mapTagtoProp[key]||key}("${info[key]}");\n`
    )).join(left_whitespace);

    return `${setter_str}\n${left_whitespace}${positon_str}`;
}

module.exports = function(text) {
    var callback = this.async();

    this.cacheable && this.cacheable();
    var options = loaderUtils.getOptions(this);
    console.log(`loader called for ${this.resource}`);

    var should_has_exports = false;
    if (options)
    {
        should_has_exports = (options.type == "export");
    }

    var self = this;
    parseString(text, options, function (err, result) {
      
      const base = path.basename(self.resource);
      const dir = path.dirname(self.resource);
      const folder = options && options.projectRoot ? (path.relative(options.projectRoot, dir)||'.') : ".";

      const filename = `${folder}${path.sep}${base}.js`;
      //console.log(filename);
      
      var generated, is_inline = false;
      if (result.Project) {
        //console.dir(result, {depth:10});
        generated = template_xprj(self, dir, result.Project);
        //is_inline = true;
      }
      else if (result.FDL) {
        const form_attr = template_form_attr(result.FDL.Form[0].$);
        generated = template_xfdljs(base, form_attr);
      }
      else if (result.ADL) {
        generated =  JSON.stringify(result);
      }
      else if (result.Script) {
        //generated = JSON.stringify(result);
      }
      else {
        //const form_attr = template_form_attr(result.FDL.Form[0].$);
        //generated = template_xfdljs(base, form_attr);
        generated = JSON.stringify(result);
       // console.dir(result);//, {depth:10});
      }

      if (err) return callback(err);

      if (should_has_exports && generated)
        generated = "module.exports=" + generated;

      if (is_inline && generated)
      {
        callback(null, generated);
      }
      else
      {
        if (generated)
        {
            console.log(filename, generated);
            self.emitFile(filename, generated);
        }

        callback(null, filename);
      }
    });
};

//module.exports.raw = true;


