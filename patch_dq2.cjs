const fs = require('fs');
let code = fs.readFileSync('src/data/index.ts', 'utf8');
code = code.replace('export { runDataQualityChecks } from "./dataQuality";', "export * from './dataQuality';");
fs.writeFileSync('src/data/index.ts', code);

code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(', runDataQualityChecks', '');
fs.writeFileSync('src/App.tsx', code);
