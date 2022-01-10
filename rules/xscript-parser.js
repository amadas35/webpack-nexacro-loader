//import nexacroParser from './custom-parser';

const nexacroParser = require("@babel/nexacro-parser");

const parseXScript = () => {
  return {
    parserOverride(code, opts) {
        opts.plugins = ["xscript", "typescript"];
      return nexacroParser.parse(code, opts);
    },
  };
}

module.exports = parseXScript;