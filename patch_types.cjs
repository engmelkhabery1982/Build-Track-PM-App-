const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(
  "| 'varianceActions';",
  "| 'varianceActions' | 'dataQuality';"
);

fs.writeFileSync('src/types/index.ts', code);
