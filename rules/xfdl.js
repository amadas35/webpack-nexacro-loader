
const path = require("path");  
const transformXScript = require("./xscript-transform.js");
const getQueryString = require("../utils/getquerystring.js");

const form_prop_alias_map = {
    'id': 'name',
    'titletext': 'title'
}
function getFormPropName(name) {
    if (name in form_prop_alias_map) 
        return form_prop_alias_map[name];

    return name;
}

const positon_props = [
    'left', 'top', 'right', 'bottom',
    'width', 'height', 'minwidth', 'maxwidth', 'minheight', 'maxheight'
];

function isPositionProp(name) {
    return positon_props.indexOf(name) > -1;
}

function hasSetter(name) {
    return true;
}

const event_prop_map = [
    'canlayoutchange', 'canstepchange', 'onactive', 'onbeforeclose', 'onbindingvaluechanged',
    'onclick', 'onclose', 'oncontextmenu', 'ondeactivate', 'ondevicebuttonup', 'ongrag', 'ondragenter',
    'ondragleave', 'ondragmove', 'ondrop', 'onerror', 'onextendedcommand', 'onhscroll', 'oninit',
    'onkeydown', 'onkeyup', 'onkillfocus', 'onlayoutchanged', 'onlbuttondown', 'onlbuttonup', 'onload',
    'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseup', 'onmousewheel', 'onmove', 
    'onorientationchange', 'onrbuttondown', 'onrbuttonup', 'onsetfocus', 'onsize', 'onstepchanged', 'ontimer', 
    'ontouchend', 'ontouchmove', 'ontouchstart', 'onvscroll'
];

function isEventProp(name) {
    return event_prop_map.indexOf(name) > -1;
}

function template_objects_to_js (objects, padleft) {
    if (!objects || objects.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));
  
    return code;
}

function template_comps_to_js (comps, padleft) {
    if (!comps || comps.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));
  
    return code;
}

function template_layouts_to_js (layouts, padleft) {
    if (!layouts || layouts.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));

    // initialize ui components

    // layout functions

    // bind items
  
    return code;
}

function template_binds_to_js (binds, padleft) {
    if (!binds || binds.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));
  
    return code;
}

function template_triggers_to_js (triggers, padleft) {
    if (!triggers || triggers.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));
  
    return code;
}

function template_preload_to_js (preload, padleft) {
    if (!preload || preload.length === 0)
      return '';
    
    var code = '';
  
    //types.forEach((type, idx, thisArray) => (code += `${padleft}${JSON.stringify(type.$, ["id", "classname", "type"])}${(idx < thisArray.length -1) ? ",\n" : ""}`));
  
    return code;
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

        code += `this.registerScript("${source}", function () {
            ${result.code}
        });`;
    }

    return code;
}

const left_whitespace = '\t';

const template_xfdl_to_js = (filename, form_attrs, objects, layouts, triggers, preload, source_code, event_str) => {
    const padleft = left_whitespace.padEnd(3, left_whitespace);

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
${template_objects_to_js(objects, padleft)}

${template_layouts_to_js(layouts, padleft)}

            // trigger items
${template_triggers_to_js(triggers, padleft)}
        };

        this.loadPreloadList = function()
        {
${template_preload_to_js(preload, padleft)}
        };

${source_code}

        // events
        this.on_initEvent = function()
        {
${event_str}
        };

        this.loadIncludeScript("${filename}");
        this.loadPreloadList();

        // Remove Reference
        obj = null;
    };
})()`;
};

// callback: (err, string, dependencies)
module.exports = function (resourcePath, fdlNode, options, callback) {

    var modules= [];
  
    const version = fdlNode.$.version;
  
    if (version < "2.0")
        return callback(new Error(`${version} is not support XFDL version. (should >= 2.0)`))
  
    const forms = fdlNode.Form;
    if (!forms || forms.length == 0)
        return callback(new Error(`Cannot found 'Form' information.`));
  
    const form = forms[0];

    // check metainfo
    // - is property
    // - is event
    // - is style property
    var init_prop_str = '', init_event_str = '';
    if (form.$) {
        const padleft = left_whitespace.padEnd(3, left_whitespace);

        var positon_str = `${padleft}if (Form == this.constructor) {
${padleft}\tthis._setFormPosition(${form.$.width}, ${form.$.height});
${padleft}}`;

        Object.keys(form.$).forEach(key => {
            if (isEventProp(key)) {
                init_event_str += `${padleft}this.addEventHandler("${key}", this.${form.$[key]}, this);\n`;
            } 
            else if (!isPositionProp(key)) {
                if (hasSetter(key)) {
                    init_prop_str += `${padleft}this.set_${getFormPropName(key)}("${form.$[key]}");\n`;
                }
                else {
                    init_prop_str += `${padleft}this.${key} = "${form.$[key]}";\n`;
                }
            }
        });

        init_prop_str += positon_str;
    }

    const source_uri = path.basename(resourcePath);

    const script_node = fdlNode.Script;
    var source_code;
    if (script_node) {
      const script_str = script_node[0]['_'];
      const padleft = left_whitespace.padEnd(2, left_whitespace);
  
      // xscript transform
      var code = '';
      const transformed_script = transformXScript(source_uri, script_str);
      if (transformed_script)
      {
        const includes = transformed_script.includes;
        if (includes && includes.length > 0)
        {
            includes.forEach(include_src => {
                code += `${padleft}this.addIncludeScript("${source}", "${include_src}");\n`;
                modules.push(`${include_src}${getQueryString({"usebase":true, "ext":"js"})}`);
            });            
        }

        code += `${padleft}this.registerScript("${source}", function () {
            ${transformed_script.code}
        });`;
      }

      source_code = code;
    }
  
    const xfdl_jsstring = template_xfdl_to_js(
        source_uri,
        init_prop_str, 
        form.Objects, 
        form.Layouts, 
        null, 
        null, 
        source_code,
        init_event_str
    );
  
    return callback(null, xfdl_jsstring, modules);
};
  
module.exports.version = "1.0";

