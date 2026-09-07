const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/export default function App\(\) \{\s*return \(\n\s*<ProjectDataDateProvider>\n\s*<AppWorkspace \/>\n\s*<\/ProjectDataDateProvider>\n\s*\);\n\}/g, "");
fs.writeFileSync('src/App.tsx', code);
