const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("if (!session) return <LoginScreen onLogin={setSession} />;", "");
// Add it inside App function if it's missing there
const findStr = "const [session, setSession] = useState<AuthSession | null>(null);";
if (!code.includes(findStr)) {
   code = code.replace("const [activeView, setActiveView] = useState<ViewKey>('dashboard');", findStr + "\n  const [activeView, setActiveView] = useState<ViewKey>('dashboard');");
}
fs.writeFileSync('src/App.tsx', code);
