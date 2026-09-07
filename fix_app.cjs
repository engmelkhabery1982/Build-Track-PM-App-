const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("function App() {", "export default function App() {");
code = code.replace("export default App;", "");
fs.writeFileSync('src/App.tsx', code);
