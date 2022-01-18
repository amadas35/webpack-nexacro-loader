
const path = require("path");  
const transformXScript = require("./xscript-transform.js");
const getQueryString = require("../utils/getquerystring.js");
const encodeXml = require("../utils/xml-encoder.js");

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


const dataobject_events = ['ondatachanged', 'onerror', 'onload', 'onsuccess', 'onvaluechanged'];
const dataset_events = ['cancolumnchange', 'canrowposchange', 'oncolumnchanged', 'onload', 'onrowposchanged', 'onrowsetchanged', 'onvaluechanged'];

function template_dataobject_to_js (dataobject, padleft) {
  if (!dataobject || !dataobject.$)
    return '';

  var code = '', left_pad = padleft;
  
  // create
  code += `${left_pad}obj = new DataObject("${dataobject.$.id}", this);\n`;

  // set property
  var event_code = '';
  for (const prop in dataobject.$) {
    if (prop === "id") continue;

    const val = dataobject.$[prop];
    if (dataobject_events.indexOf(prop) > -1 && val) {
      event_code += `${left_pad}obj.addEventHandler("${prop}", this.${val}, this);\n`;
    }
    else {
      code += `${left_pad}obj.set_${prop}("${val}");\n`;
    }
  }

  // set contents
  if (dataobject.elements) {
    const contents = dataobject.elements.find(element => element.name === "Contents");
    if (contents && contents.elements) {
      contents.elements.forEach(content => (code += `${left_pad}obj._setContents(${content._});\n`));
    }
  }

  if (event_code)
    code += event_code;

  code += `${left_pad}this.addChild(obj.name, obj);\n`;

  return code;
}

function template_dataset_to_js (dataset, padleft) {
  if (!dataset || !dataset.$)
    return '';

  var code = '', left_pad = padleft;
  
  // create
  code += `${left_pad}obj = new Dataset("${dataset.$.id}", this);\n`;

  // set property
  var event_code = '';
  for (const prop in dataset.$) {
    if (prop === "id") continue;

    const val = dataset.$[prop];
    if (dataset_events.indexOf(prop) > -1 && val) {
      event_code += `${left_pad}obj.addEventHandler("${prop}", this.${val}, this);\n`;
    }
    else {
      code += `${left_pad}obj.set_${prop}("${val}");\n`;
    }
  }

  // set contents
  if (dataset.elements) {
    const colinfoNode = dataset.elements.find(element => element.name === "ColumnInfo");
    if (colinfoNode && colinfoNode.elements) {
      var content_string;

      content_string = '<ColumnInfo>';

      const columninfos = colinfoNode.elements;

      columninfos.forEach(colinfo => {
        if (colinfo.name === "ConstColumn") {
          content_string += `<ConstColumn id=\\"${colinfo.$.id}\\" type=\\"${colinfo.$.type}\\" size=\\"${colinfo.$.size}\\"`;
          if (colinfo.$.value) content_string += ` value=\\"${encodeXml(colinfo.$.value)}\\"`;
          if (colinfo.$.datapath) content_string += ` datapath=\\"${colinfo.$.datapath}\\"`;
          content_string += "/>";
        }
        else if (colinfo.name === "Column") {
          content_string += `<Column id=\\"${colinfo.$.id}\\" type=\\"${colinfo.$.type}\\" size=\\"${colinfo.$.size}\\"`;
          if (colinfo.$.datapath) content_string += ` datapath=\\"${colinfo.$.datapath}\\"`;
          if (colinfo.$.prop) content_string += ` prop=\\"${colinfo.$.prop}\\"`;
          if (colinfo.$.sumtext) content_string += ` sumtext=\\"${colinfo.$.sumtext}\\"`;
          content_string += "/>";
        }
      });

      content_string += '</ColumnInfo>';

      const rowsNode = dataset.elements.find(element => element.name === "Rows");
      if (rowsNode && rowsNode.elements) {
        content_string += '<Rows>';

        const rows = rowsNode.elements;
        rows.forEach(rowinfo => {
          content_string += "<Row>";

          if (rowinfo.elements) {
            const cols = rowinfo.elements.filter(element => element.name === "Col");
            cols.forEach(col => {
              var col_value = '';
              if (col.elements && col.elements.length > 0) {
                col_value = encodeXml(col.elements.find(element => element.type === "text")['_'], true);
              }
              content_string += `<Col id=\\"${col.$.id}\\">${col_value}</Col>`;
            });
          }

          content_string += "</Row>";
        });

        content_string += '</Rows>';
      }

      code += `${left_pad}obj._setContents("${content_string}");\n`
    }
  }

  if (event_code)
    code += event_code;
  
  code += `${left_pad}this.addChild(obj.name, obj);\n`;

  return code;
}

function template_object_to_js (object, padleft) {
  if (!object || !object.$)
    return '';

  var code = '';

  // create
  code += `${padleft}obj = new ${object.name}("${object.$.id}", this);\n`;

  // set property
  var event_code = '';
  for (const prop in object.$) {
    if (prop === "id") continue;

    const val = object.$[prop];
    //if (dataset_events.indexOf(prop) > -1 && val) {
    //  event_code += `${padleft}obj.addEventHandler("${prop}", this.${val}, this);\n`;
    //}
    //else {
    //  code += `${padleft}obj.set_${prop}("${val}");\n`;
    //}
    code += `${padleft}obj.set_${prop}("${val}");\n`;
  }
  
  if (event_code)
    code += event_code;
  
  code += `${padleft}this.addChild(obj.name, obj);\n`;
  
  return code;
}

function template_objects_to_js (objects, padleft) {
    if (!objects || !objects.elements)
      return '';
    
    //parseString
    var code = '';
  
    objects.elements.forEach(element => {
      if (element.name === "Dataset") {
        code += (template_dataset_to_js(element, padleft) + "\n");
      }
      else if (element.name === "DataObject") { // for contents object
        code += (template_dataobject_to_js(element, padleft) + "\n");
      }
      else {
        code += (template_object_to_js(element, padleft) + "\n");
      }
    });
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
  
    if (!fdlNode.elements || fdlNode.elements.length == 0)
      return callback(new Error(`Cannot found Form information.`));

    const form = fdlNode.elements.find(element => element.name === "Form");
    if (!form)
        return callback(new Error(`Cannot found Form information.`));

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
    var layoutsNode, objectsNode, source_code;

    if (form.elements) {
      const script_node = form.elements.find(element => element.name === "Script");

      if (script_node && script_node.elements) {
        const cdata_node = script_node.elements.find(element => element.type === "cdata");

        if (cdata_node) {
          const script_str = cdata_node._;
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

            code += `${padleft}this.registerScript("${source_uri}", function () {
${transformed_script.code}
});`;
          }

          source_code = code;
        }
      }

      layoutsNode = form.elements.find(element => element.name === "Layouts");
      objectsNode = form.elements.find(element => element.name === "Objects");
    }
  
    const xfdl_jsstring = template_xfdl_to_js(
        source_uri,
        init_prop_str, 
        objectsNode, 
        layoutsNode, 
        null, 
        null, 
        source_code,
        init_event_str
    );
  
    return callback(null, xfdl_jsstring, modules);
};
  
module.exports.version = "1.0";

