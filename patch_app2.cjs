const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the old block starting at `if (activeView === 'dataQuality') {` and ending after `</div></div></div>;`
const regex = /if \(activeView === 'dataQuality'\) \{\s+const checks = runDataQualityChecks[\s\S]+?<\/div><\/div><\/div>;\s+\}/g;
code = code.replace(regex, "");

fs.writeFileSync('src/App.tsx', code);
