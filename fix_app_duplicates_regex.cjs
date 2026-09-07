const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// There is another one at 4913
code = code.replace(/export default function App\(\) \{\n.*?return \(\n.*?<ProjectDataDateProvider>\n.*?<AppWorkspace \/>\n.*?<\/ProjectDataDateProvider>\n.*?\);\n\}/gs, "");

fs.writeFileSync('src/App.tsx', code);
