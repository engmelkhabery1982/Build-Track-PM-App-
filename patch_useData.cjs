const fs = require('fs');
let code = fs.readFileSync('src/hooks/useData.ts', 'utf8');
code = code.replace("return {", "return { dataRepository,");
fs.writeFileSync('src/hooks/useData.ts', code);
