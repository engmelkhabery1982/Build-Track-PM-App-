const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (code.includes('function App({ onLogin })')) {
  code = code.replace(/function App\(\{(.*?)\}\) \{/g, 'export default function App() {');
  fs.writeFileSync('src/App.tsx', code);
}
