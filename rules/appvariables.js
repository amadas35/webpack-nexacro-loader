
const path = require("path");
const encodeXml = require("../utils/xml-encoder.js");

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

  code += `${left_pad}this._addDataObject(obj.name, obj);\n`;

  return code;
}

function template_dataobjects_to_js (dataobjects, padleft) {
  if (!dataobjects  || dataobjects.length == 0)
    return '';

  var code = '';
  dataobjects.forEach(obj => code += (template_dataobject_to_js(obj, padleft) + "\n"));

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
  
  code += `${left_pad}this._addDataset(obj.name, obj);\n`;

  return code;
}

function template_datasets_to_js (datasets, padleft) {
  if (!datasets  || datasets.length == 0)
    return '';

  var code = '';
  datasets.forEach(obj => code += (template_dataset_to_js(obj, padleft) + "\n"));

  return code;
}

function template_variables_to_js (variables, padleft) {
  if (!variables  || variables.length == 0)
    return '';

  var code = '';
  variables.forEach(v => code += (`${padleft}this._addVariable("${v.$.id}","${v.$.initval || ""}");\n`));

  return code;
}

function template_appvariables_to_js (datasets, variables, dataobjects) {

  const left_whitespace = '\t';
  const padleft = left_whitespace.padEnd(3, left_whitespace);

  return `if (nexacro._Application)
{
  var application = nexacro._Application;

  application._on_load_AppDataObjects = function () 
  {
    var obj = null;

    // global dataobject
${template_dataobjects_to_js(dataobjects, padleft)}

    // global dataset
${template_datasets_to_js(datasets, padleft)}

    // global variable
${template_variables_to_js(variables, padleft)}

    obj = null;
  };
}`;
};

// callback: (err, string, dependencies)
module.exports = function (resourcePath, appvarsNode, options, callback) {

  const version = appvarsNode.$.version;

  if (version < "2.0")
      return callback(new Error(`${version} is not support appvariables version. (should >= 2.0)`));

  if (!appvarsNode.elements || appvarsNode.elements.length == 0)
    return callback(new Error(`Cannot found 'appvariables' information.`));
    
  // dependency modules info
  const modulesNode = appvarsNode.elements.find(element => element.name === "Datasets");
  if (!modulesNode || !modulesNode.elements || modulesNode.elements.length == 0)
    return callback(new Error(`Cannot found 'Modules' information in ${resourcePath}.`));
      
  // datasets
  var datasets;
  const datasetsNode = appvarsNode.elements.find(element => element.name === "Datasets");
  if (datasetsNode)
    datasets = datasetsNode.elements;

  // variables
  var variables;
  const variablesNode = appvarsNode.elements.find(element => element.name === "Variables");
  if (variablesNode)
    variables = variablesNode.elements;

  // DataObjects
  var dataobjects;
  const dataobjectsNode = appvarsNode.elements.find(element => element.name === "DataObjects");
  if (dataobjectsNode)
    dataobjects = dataobjectsNode.elements;
  
  const appvars_jsstring = template_appvariables_to_js(datasets, variables, dataobjects);

  return callback(null, appvars_jsstring, []);
};

module.exports.version = "1.0";



