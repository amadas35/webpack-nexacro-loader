
const path = require("path");  
const transformXScript = require("./xscript-transform.js");
const getQueryString = require("../utils/getquerystring.js");
const encodeXml = require("../utils/xml-encoder.js");
const js2xml = require("xml-js").js2xml;

const left_whitespace = '\t';

const form_prop_alias_map = {
    'id': 'name'
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

const layout_props = [
  'name', 'width', 'height', 'screenid', 'stepcount', 'stepindex',
  'description', 'mobileorientation'
];
const layout_mutable_props = [
  'screenid', 'stepcount', 'stepindex', 'description', 'mobileorientation'
];
function isLayoutProp(name) {
  return layout_props.indexOf(name) > -1;
}
function isLayoutMutableProp(name) {
  return layout_mutable_props.indexOf(name) > -1;
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

function isEventProp(className, propName) {
  if (className === "Form")
    return event_prop_map.indexOf(propName) > -1;
  
  return false;
}

var event_init_codes = [];
function event_process(listener, event_id, event_handler, handler_target) {
  const code = `${listener}.addEventHandler("${event_id}", ${handler_target}.${event_handler}, ${handler_target});`;
  event_init_codes.push(code);
};

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

function template_dataset_content_xml_string (dataset) {
  if (!dataset || !dataset.elements)
    return "";

  var content_string = '';
  // set contents
  const colinfoNode = dataset.elements.find(element => element.name === "ColumnInfo");
  if (colinfoNode && colinfoNode.elements) {

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
  }

  return content_string;
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
    const content_string = template_dataset_content_xml_string(dataset);
    code += `${left_pad}obj._setContents("${content_string}");\n`;
  }

  if (event_code)
    code += event_code;
  
  code += `${left_pad}this.addChild(obj.name, obj);\n`;

  return code;
}

// eventProcessor (listener, event_id, event_handler, handler_target)
function template_form_init_js (form, padleft, eventProcessor) {
  if (!form || !form.$)
    return '';
  
  var code = '';

  if (form.elements) {
    const init_value = form.elements.find(element => (element.name === "InitValue"));
    if (init_value && init_value.$) {
      for (const prop in init_value.$) {
        if (!(prop in form.$)) {
          const val = init_value.$[prop];
    
          if (hasSetter(prop)) {
            code += `${padleft}this.set_${getFormPropName(prop)}("${val}");\n`;
          }
          else {
            code += `${padleft}this.getSetter("${prop}").set("${val}");\n`;
          }
        }
      }
    }
  }

  for (const prop in form.$) {
    if (!isPositionProp(prop)) {
      const val = form.$[prop];

      if (isEventProp(form.name, prop)) {
        if (eventProcessor) eventProcessor("this", prop, val, "this");
      }
      else if (hasSetter(prop)) {
        code += `${padleft}this.set_${getFormPropName(prop)}("${val}");\n`;
      }
      else {
        code += `${padleft}this.getSetter("${prop}").set("${val}");\n`;
      }
    }
  }

  code += `${padleft}if (Form == this.constructor) {
${padleft}\tthis._setFormPosition(${form.$.width}, ${form.$.height});
${padleft}}`;

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

// eventProcessor (listener, event_id, event_handler, handler_target)
function template_comp_init_js (comp, padleft, parent, target, eventProcessor) {
    if (!comp || !comp.$)
      return '';
    
    var code = '';
  
    // create
    const left    = comp.$.left   ? `"${comp.$.left}"`    : "null";
    const top     = comp.$.top    ? `"${comp.$.top}"`     : "null";
    const width   = comp.$.width  ? `"${comp.$.width}"`   : "null";
    const height  = comp.$.height ? `"${comp.$.height}"`  : "null";
    const right   = comp.$.right  ? `"${comp.$.right}"`   : "null";
    const bottom  = comp.$.bottom ? `"${comp.$.bottom}"`  : "null";

    const minwidth  = comp.$.minwidth   ? `"${comp.$.minwidth}"`  : "null";
    const maxwidth  = comp.$.maxwidth   ? `"${comp.$.maxwidth}"`  : "null";
    const minheight = comp.$.minheight  ? `"${comp.$.minheight}"`  : "null";
    const maxheight = comp.$.maxheight  ? `"${comp.$.maxheight}"`  : "null";

    if (!parent) parent = "this";
    if (!target) target = parent;

    code += `${padleft}obj = new ${comp.name}("${comp.$.id}", ${left}, ${top}, ${width}, ${height}, ${right}, ${bottom}, ${minwidth}, ${maxwidth}, ${minheight}, ${maxheight}, ${target});\n`;

    // set property
    var event_code = '';
    for (const prop in comp.$) {
      if (prop === "id") continue;

      if (!isPositionProp(prop)) {
        const val = comp.$[prop];

        if (isEventProp(comp.name, prop)) {
          if (eventProcessor) eventProcessor(`${target}.${comp.$.id}`, prop, val, "this");
        }
        else if (prop === "innerdataset" && val === "innerdataset" && comp.elements) {
          const inner_dataset = comp.elements.find(element => (element.name == "Dataset" && element.$ && element.$.id == val));
          if (inner_dataset) {
            const generated_ds_id = (`${target}.${comp.$.id}.${val}`).replace(/^this\.?/, "").replace(/\./gi, '_').replace(/^_/, '');
            code += `${padleft}var ${generated_ds_id} = new nexacro.NormalDataset("${generated_ds_id}", obj);\n`;

            if (inner_dataset.elements) {
              const content_string = template_dataset_content_xml_string(inner_dataset);
              code += `${padleft}${generated_ds_id}._setContents("${content_string}");\n`;
            }       

            code += `${padleft}obj.set_${prop}("${generated_ds_id}");\n`;
          }
          else {
            code += `${padleft}obj.set_${prop}("${val}");\n`;
          }
        }
        else if (hasSetter(prop)) {
          code += `${padleft}obj.set_${prop}("${val}");\n`;
        }
        else {
          code += `${padleft}obj.getSetter("${prop}").set("${val}");\n`;
        }
      }
    }

    if (comp.elements) {
      const contents_node = comp.elements.find(element => (element.name === "Formats" || element.name === "Contents"));
      if (contents_node) {
        // build xml string
        const contents_xml = js2xml(contents_node, {
          compact: false,
          ignoreDeclaration: true,
          ignoreInstruction: true,
          ignoreComment: true,
          ignoreDoctype: true,
          attributesKey: '$',
          textKey: '_',
          cdataKey: '_'
        });

        var contents_xml_str = contents_xml.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\"/g, "\\\"");
        code += `${padleft}obj._setContents("${contents_xml_str}");\n`;
      }
    }

    code += `${padleft}${parent}.addChild(obj.name, obj);\n`;
  
    if (comp.elements) {
      comp.elements.forEach(child => {
        if (child.name === "Layouts") {
          const sub_parent = `${parent}.${comp.$.id}`;
          const sub_target = `${sub_parent}.form`;

          const sub_default_layout = child.elements.find(element => (!element.$ || element.$.name === undefined || element.$.name === "default"));
          if (!sub_default_layout) {
            throw (new Error(`Cannot found 'default' layout from form.`));
          }

          if (sub_default_layout.elements) {
            code += "\n";

            sub_default_layout.elements.forEach(sub_element => {
              code += (template_comp_init_js(sub_element, padleft, sub_parent, sub_target, event_process) + "\n");
            });
          }
        }
        else if (child.name !== "Dataset" && child.name !== "Formats" && child.name !== "Contents") {
          // tabpages case
        }
      });
    }

    return code;
}

function template_comps_init_js (components, padleft, parent, target, eventProcessor) {
  if (!components || !components.$)
    return '';

  var code = '';

  // UI Components Initialize
  if (components.elements) {
    components.elements.forEach(element => (code += (template_comp_init_js(element, padleft, parent, target, eventProcessor) + "\n")));
  }

  return code;
}

// tabpage, ...
function template_layoutchange_control_prop_js (layoutid, control, padleft, parent, control_path) {
  if (!control || !control.$ || !parent)
    return '';
  
  var code = '';

  // set property
  var event_code = '';
  for (const prop in control.$) {
    if (prop === "id") continue;

    if (!isPositionProp(prop) && !isEventProp(control.name, prop)) {
      const val = control.$[prop];

      if (hasSetter(prop)) {
        code += `${padleft}p.${control_path}.${control.$.id}.set_${prop}("${val}");\n`;
      }
      else {
        code += `${padleft}p.${control_path}.${control.$.id}.getSetter("${prop}").set("${val}");\n`;
      }
    }
  }

  if (control.elements) {
    control.elements.forEach(child => {
      if (child.name === "Layouts") {
        if (!child.elements) {
          throw (new Error(`Cannot found 'default' layout from form.`));
        }

        const matched_layout = child.elements.find(child_layout => {
          if (layoutid === "default")
            return (!child_layout.$ || child_layout.$.name === undefined || child_layout.$.name === "default");
          
          return child_layout.$ && child_layout.$.name === layoutid;
        });

        if (matched_layout && matched_layout.elements) {
          const embeded_parent = `${parent}.${control.$.id}.form`;
          
          if (matched_layout.elements.length > 0) {
            code += `\n${padleft}old_p = p;\n`;
            code += `${padleft}p = ${embeded_parent};\n`;

            matched_layout.elements.forEach(embeded_element => {
              code += (template_layoutchange_comp_prop_js(layoutid, embeded_element, padleft, embeded_parent) + "\n");
            });

            code += `${padleft}p = old_p;\n`;
          }
        }
      }
      else if (child.name === "Formats" || child.name === "Contents") {
        // do nothing
      }
      else if (child.name === "Dataset" && child.$ && layoutid === "default") {
        const generated_ds_id = (`${parent}.${control.$.id}.${child.$.id}`).replace(/^rootobj\.?/, "").replace(/\./gi, '_').replace(/^_/, '');
        code += `${padleft}p.${comp.$.id}.set_${child.$.id}("${generated_ds_id}");\n`;
      }
      else {
        if (child.$) {
          code += (template_layoutchange_control_prop_js(layoutid, child, padleft, `${parent}.${control.$.id}`, `${control_path}.${control.$.id}`) + "\n");
        }
        else if (child.elements) {
          child.elements.forEach(child_control => code += (template_layoutchange_control_prop_js(layoutid, child_control, padleft, `${parent}.${control.$.id}`, `${control_path}.${control.$.id}`) + "\n"));
        }
      }
    });
  }

  return code;
}

function template_layoutchange_comp_prop_js (layoutid, comp, padleft, parent) {
  if (!comp || !comp.$)
    return '';
  
  var code = '';

  // create
  const left    = comp.$.left   ? `"${comp.$.left}"`    : "null";
  const top     = comp.$.top    ? `"${comp.$.top}"`     : "null";
  const width   = comp.$.width  ? `"${comp.$.width}"`   : "null";
  const height  = comp.$.height ? `"${comp.$.height}"`  : "null";
  const right   = comp.$.right  ? `"${comp.$.right}"`   : "null";
  const bottom  = comp.$.bottom ? `"${comp.$.bottom}"`  : "null";

  const minwidth  = comp.$.minwidth   ? `"${comp.$.minwidth}"`  : "null";
  const maxwidth  = comp.$.maxwidth   ? `"${comp.$.maxwidth}"`  : "null";
  const minheight = comp.$.minheight  ? `"${comp.$.minheight}"`  : "null";
  const maxheight = comp.$.maxheight  ? `"${comp.$.maxheight}"`  : "null";

  if (!parent) parent = "rootobj";

  // set property
  var event_code = '';
  for (const prop in comp.$) {
    if (prop === "id") continue;

    if (!isPositionProp(prop) && !isEventProp(comp.name, prop)) {
      const val = comp.$[prop];

      if (hasSetter(prop)) {
        code += `${padleft}p.${comp.$.id}.set_${prop}("${val}");\n`;
      }
      else {
        code += `${padleft}p.${comp.$.id}.getSetter("${prop}").set("${val}");\n`;
      }
    }
  }
  
  code += `${padleft}p.${comp.$.id}.move(${left}, ${top}, ${width}, ${height}, ${right}, ${bottom});\n`;

  if (comp.elements) {
    comp.elements.forEach(child => {
      if (child.name === "Layouts") {
        if (!child.elements) {
          throw (new Error(`Cannot found 'default' layout from form.`));
        }

        const matched_layout = child.elements.find(child_layout => {
          if (layoutid === "default")
            return (!child_layout.$ || child_layout.$.name === undefined || child_layout.$.name === "default");
          
          return child_layout.$ && child_layout.$.name === layoutid;
        });

        if (matched_layout && matched_layout.elements) {
          const embeded_parent = `${parent}.${comp.$.id}.form`;
          if (matched_layout.elements.length > 0) {

            code += `\n${padleft}old_p = p;\n`;
            code += `${padleft}p = ${embeded_parent};\n`;

            matched_layout.elements.forEach(embeded_element => {
              code += (template_layoutchange_comp_prop_js(layoutid, embeded_element, padleft, embeded_parent) + "\n");
            });

            code += `${padleft}p = old_p;\n`;
          }
        }
      }
      else if (child.name === "Formats" || child.name === "Contents") {
        // do nothing
      }
      else if (child.name === "Dataset" && child.$ && layoutid === "default") {
        const generated_ds_id = (`${parent}.${comp.$.id}.${child.$.id}`).replace(/^rootobj\.?/, "").replace(/\./gi, '_').replace(/^_/, '');
        code += `${padleft}p.${comp.$.id}.set_${child.$.id}("${generated_ds_id}");\n`;
      }
      else {
        if (child.$) {
          code += (template_layoutchange_control_prop_js(layoutid, child, padleft, `${parent}.${comp.$.id}`, comp.$.id) + "\n");
        }
        else if (child.elements) {
          child.elements.forEach(child_control => code += (template_layoutchange_control_prop_js(layoutid, child_control, padleft, `${parent}.${comp.$.id}`, comp.$.id) + "\n"));
        }
      }
    });
  }

  return code;
}

function template_layoutchange_form_prop_js (form, padleft) {
  if (!form || !form.$)
    return '';
  
  var code = `${padleft}p = rootobj;\n`;

  if (form) {
    for (const prop in form.$) {
      if (!isPositionProp(prop) && !isEventProp(form.name, prop)) {
        const val = form.$[prop];

        if (hasSetter(prop)) {
          code += `${padleft}p.set_${getFormPropName(prop)}("${val}");\n`;
        }
        else {
          code += `${padleft}p.getSetter("${prop}").set("${val}");\n`;
        }
      }
    }
  }

  return code;
}

function template_layoutchange_layout_form_prop_js (layout, padleft) {
  if (!layout || !layout.$)
    return '';
  
  var code = `${padleft}p = rootobj;\n`;

  if (layout) {
    for (const prop in layout.$) {
      if (!isLayoutProp(prop) && !isPositionProp(prop)) {
        const val = layout.$[prop];

        if (hasSetter(prop)) {
          code += `${padleft}p.set_${prop}("${val}");\n`;
        }
        else {
          code += `${padleft}p.getSetter("${prop}").set("${val}");\n`;
        }
      }
    }
  }

  return code;
}

function template_layoutchange_layout_prop_js (layout, padleft) {
  if (!layout || !layout.$)
    return '';
  
  var code = '';

  if (layout) {
    for (const prop in layout.$) {
      if (isLayoutMutableProp(prop)) {
        const val = layout.$[prop];

        if (hasSetter(prop)) {
          code += `${padleft}obj.set_${prop}("${val}");\n`;
        }
        else {
          code += `${padleft}obj.getSetter("${prop}").set("${val}");\n`;
        }
      }
    }
  }

  return code;
}

function template_layoutchange_js (form, layoutid, layout, padleft, parent) {
  if (!layout || !layout.$)
    return '';

  var code = '';
  

  if (layoutid === "default") {
    code += (template_layoutchange_form_prop_js(form, padleft) + "\n");
  }
  else {
    code += (template_layoutchange_layout_form_prop_js(layout, padleft) + "\n");
  }

  if (layout.elements) {
    layout.elements.forEach(element => {
      code += (template_layoutchange_comp_prop_js(layoutid, element, padleft, parent) + "\n");
    });
  }

  return code;
}

function template_layout_to_js (form, layout, padleft) {
  if (!layout || !layout.$)
    return '';

  var code = '';

  const layout_id = (layout.$.name || "default");
  const codeblock_padding = `${padleft}${left_whitespace}`;  

  const change_code = template_layoutchange_js(form, layout_id, layout, `${codeblock_padding}`, "rootobj");  

  // layout functions
  var changeFn = `function (p) {
${codeblock_padding}var rootobj = p, old_p;

${change_code}
${padleft}}`;

  code += `${padleft}obj = new Layout("${layout_id}", "${layout.$.screenid || ""}", ${layout.$.width}, ${layout.$.height}, this, ${changeFn});\n`;
  code += (template_layoutchange_layout_prop_js(layout, padleft) + "\n");

  return code;
}

function template_layouts_to_js (form, layouts, padleft, parent, target) {
  if (!layouts || !layouts.elements)
    return '';

  var code = '';

  const default_layout = layouts.elements.find(element => (!element.$ || element.$.name === undefined || element.$.name === "default"));
  if (!default_layout) {
    throw (new Error(`Cannot found 'default' layout from form.`));
  }

  // UI Components Initialize
  if (default_layout.elements) {
    default_layout.elements.forEach(element => {
      code += (template_comp_init_js(element, padleft, parent, target, event_process) + "\n");
    });
  }

  // layout functions
  if (layouts.elements.length == 1) {
    code += `${padleft}obj = new Layout("default", "${default_layout.$.screenid || ""}", ${default_layout.$.width}, ${default_layout.$.height}, this, function (p) {});\n`;
  }
  else {
    code += (template_layout_to_js(form, default_layout, padleft) + "\n");

    layouts.elements.forEach(element => {
      if (element.$ && element.$.name) code += (template_layout_to_js(form, element, padleft) + "\n");
    });
  }  

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



const template_xfdl_to_js = (filename, form, objects, layouts, triggers, preload, source_code, event_codes) => {
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
${template_form_init_js(form, padleft, event_process)}

      // initialize objects
${template_objects_to_js(objects, padleft)}

${template_layouts_to_js(form, layouts, padleft)}

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
${padleft}${event_codes.join(`\n${padleft}`)}
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
        return callback(new Error(`${version} is not support XFDL version. (should >= 2.0)`));
  
    if (!fdlNode.elements || fdlNode.elements.length == 0)
      return callback(new Error(`Cannot found Form information.`));

    const form = fdlNode.elements.find(element => element.name === "Form");
    if (!form)
        return callback(new Error(`Cannot found Form information.`));

    const source_uri = path.basename(resourcePath);
    var layoutsNode, objectsNode, source_code;

    event_init_codes = [];
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
          if (transformed_script) {
            const includes = transformed_script.includes;
            if (includes && includes.length > 0) {
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
        form, 
        objectsNode, 
        layoutsNode, 
        null, 
        null, 
        source_code,
        event_init_codes
    );
  
    event_init_codes = [];
    return callback(null, xfdl_jsstring, modules);
};
  
module.exports.version = "1.0";

