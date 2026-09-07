const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("export default function LoginScreen", "export function LoginScreen");
fs.writeFileSync('src/App.tsx', code);
