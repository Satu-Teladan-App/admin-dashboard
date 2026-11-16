const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function evaluate(text, context, file) {
  const exports = {};
  const code = ts.transpileModule(text, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, Date, console: { error() {}, log() {} }, ...context }, { filename: file });
  return exports;
}
function loadModule(file, dependencies = {}) {
  return evaluate(fs.readFileSync(path.join(root, file), 'utf8'), { require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected fixture import: ${name}`);
    return dependencies[name];
  } }, file);
}
function handlers(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found.set(node.name.text, node.getText(source));
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) found.set(node.name.getText(source), `const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const name of names) if (!found.has(name)) throw Error(`Handler missing: ${file}: ${name}`);
  return evaluate([...found.values(), ...names.map(name => `exports.${name} = ${name};`)].join('\n'), context, file);
}
module.exports = { loadModule, handlers };
