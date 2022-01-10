
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
  const contents = dataobject.Contents;
  if (contents && contents.length > 0)
    contents.forEach(content => (code += `${left_pad}obj._setContents(${content});\n`));

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
  var content_string;

  const colinfoNode = dataset.ColumnInfo;
  if (colinfoNode && colinfoNode.length > 0)
  {
    content_string = '<ColumnInfo>';

    const constcols = colinfoNode[0].ConstColumn;
    const normalcols =colinfoNode[0].Column;

    if (constcols && constcols.length) {
      constcols.forEach(colinfo => {
        content_string += `<ConstColumn id=\\"${colinfo.$.id}\\" type=\\"${colinfo.$.type}\\" size=\\"${colinfo.$.size}\\"`;
        if (colinfo.$.value) content_string += ` value=\\"${encodeXml(colinfo.$.value)}\\"`;
        if (colinfo.$.datapath) content_string += ` datapath=\\"${colinfo.$.datapath}\\"`;
        content_string += "/>";
      });
    }

    if (normalcols && normalcols.length) {
      normalcols.forEach(colinfo => {
        content_string += `<Column id=\\"${colinfo.$.id}\\" type=\\"${colinfo.$.type}\\" size=\\"${colinfo.$.size}\\"`;
        if (colinfo.$.datapath) content_string += ` datapath=\\"${colinfo.$.datapath}\\"`;
        if (colinfo.$.prop) content_string += ` prop=\\"${colinfo.$.prop}\\"`;
        if (colinfo.$.sumtext) content_string += ` sumtext=\\"${colinfo.$.sumtext}\\"`;
        content_string += "/>";
      });
    }

    content_string += '</ColumnInfo>';

    const rowsNode = dataset.Rows;
    if (rowsNode && rowsNode.length > 0) {
      content_string += '<Rows>';

      const rows = rowsNode[0].Row;
      rows.forEach(rowinfo => {
        content_string += "<Row>";

        const cols = rowinfo.Col;
        cols.forEach(col => (content_string += `<Col id=\\"${col.$.id}\\">${encodeXml(col._, true)}</Col>`));

        content_string += "</Row>";
      });

      content_string += '</Rows>';
    }

    code += `${left_pad}obj._setContents("${content_string}");\n`
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

  // datasets
  var datasets;
  const datasetsNode = appvarsNode.Datasets;
  if (datasetsNode && datasetsNode.length > 0)
  {
    datasets = datasetsNode[0].Dataset;
  }

  // variables
  var variables;
  const variablesNode = appvarsNode.Variables;
  if (variablesNode && variablesNode.length > 0)
  {
    variables = variablesNode[0].Variable;
  }

  // DataObjects
  var dataobjects;
  const dataobjectsNode = appvarsNode.DataObjects;
  if (dataobjectsNode && dataobjectsNode.length > 0)
  {
    dataobjects = dataobjectsNode[0].DataObject;
  }
  
  const appvars_jsstring = template_appvariables_to_js(datasets, variables, dataobjects);

  return callback(null, appvars_jsstring, []);
};

module.exports.version = "1.0";



