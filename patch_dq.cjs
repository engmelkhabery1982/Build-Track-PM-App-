const fs = require('fs');
let code = fs.readFileSync('src/data/dataQuality.ts', 'utf8');
code = code.replace("import { dataRepository } from './repository';", "import { dataRepository } from '@/data';");
fs.writeFileSync('src/data/dataQuality.ts', code);

code = fs.readFileSync('src/components/DataQualityChecks.tsx', 'utf8');
code = code.replace("import { dataRepository } from '@/data/repository';", "import { dataRepository } from '@/data';");
fs.writeFileSync('src/components/DataQualityChecks.tsx', code);

code = fs.readFileSync('src/data/index.ts', 'utf8');
code = code.replace("export { runDataQualityChecks } from './dataQuality';", "export * from './dataQuality';");
fs.writeFileSync('src/data/index.ts', code);
