const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// There are multiple functions named 'App' now. Let's clean it all up.
code = code.replace(/export default function App\(\) \{\n.*?return \(\n\s*<ProjectDataDateProvider>\n\s*<AppWorkspace \/>\n\s*<\/ProjectDataDateProvider>\n\s*\);\n\}/gs, "");

// Add a single correct export default function App
const appDefinition = `
export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);

  if (!session) return <LoginScreen onLogin={setSession} />;

  return (
    <ProjectDataDateProvider>
      <AppWorkspace session={session} setSession={setSession} />
    </ProjectDataDateProvider>
  );
}
`;

// Add session props to AppWorkspace
code = code.replace("function AppWorkspace() {", "function AppWorkspace({ session, setSession }: { session: AuthSession, setSession: (s: AuthSession | null) => void }) {");

// append correct App at the end
code = code + "\n" + appDefinition;

fs.writeFileSync('src/App.tsx', code);
