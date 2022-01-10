const path = require("path");
const { parse, traverse, transformFromAstSync } = require("@babel/core");
const parseXScript = require("./xscript-parser.js");

const transform_template = function transform_include(source) {
    return `this.executeIncludeScript("${source}")`;
  };

function transformXScript(source, script_str) {

    const ast = parse(script_str, {
        sourceType: 'script',    
        plugins: [ parseXScript ]
    });

    var includeList = [];
    traverse(ast, {
        ImportDeclaration(path) {
            const kind = path.node.importKind;
            const source = path.node.source;
            if (kind !== "include" || !source) return;
      
            includeList.push(source.value);
      
            path.replaceWithSourceString(transform_template(source.value));
        },
    });

    //const result = babel.generate(ast, script_str);
    const result = transformFromAstSync(ast, script_str, {
        configFile: false,
    });

    //TODO: tranpile xscript by using babel-loader
    // transformSync 함수로 파싱, 변형, 생성을 한꺼번에!, include list 처리가 불가
    /*const result = babel.transformSync(script_str, {
        plugins: [
            { 
                parserOverride (code, opts) {
                    opts = {
                        sourceType: 'script',
                        plugins: [
                            'xscript', 'typescript'
                        ]
                    };
                    return nexacroParser.parse(code, opts);
                },
            },
            "@babel/plugin-transform-xscript",
            "@babel/plugin-transform-typescript",
        ],
        configFile: false,
    });*/

    var generated = { includes: includeList };
    generated.code = result.code;

    return generated;
}

module.exports = transformXScript;