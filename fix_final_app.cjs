const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The duplicate regex might have missed due to whitespace variations. Let's do a strict find/replace.
const badAppExport = "export default function App() {\n      return (\n    <ProjectDataDateProvider>\n      <AppWorkspace />\n    </ProjectDataDateProvider>\n  );\n}";
code = code.replace(badAppExport, "");

fs.writeFileSync('src/App.tsx', code);
