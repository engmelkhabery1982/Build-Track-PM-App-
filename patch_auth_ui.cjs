const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert Auth Context and UI wrapper
const authImport = `import { AppUser, AuthSession } from '@/types';\n`;

const loginUI = `
function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const users = await dataRepository.list<AppUser>('app_users');
      const user = users.find(u => u.username === username);
      if (!user) throw new Error('Invalid credentials');
      
      // In a real app this would hash and verify
      // For this phase, we mock verification against the test setup
      if (username === 'admin' && password === 'admin') {
         onLogin({ token: crypto.randomUUID(), user });
         return;
      }
      throw new Error('Invalid credentials');
    } catch(err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">BuildTrack Sign In</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Local Auth (G2)</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input name="username" type="text" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Username (admin)" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <input name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Password (admin)" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;

if (!code.includes('LoginScreen')) {
  code = authImport + code;
  code = code.replace("function App() {", loginUI + "\nfunction App() {");
  
  // Add auth state
  code = code.replace("const [activeView, setActiveView] = useState<ViewKey>('dashboard');", "const [session, setSession] = useState<AuthSession | null>(null);\n  const [activeView, setActiveView] = useState<ViewKey>('dashboard');");
  
  // Wrap main return
  code = code.replace("return (\n    <ProjectDataDateProvider", "if (!session) return <LoginScreen onLogin={setSession} />;\n\n  return (\n    <ProjectDataDateProvider");
  
  // Pass session to user menus if any, or just display it
  const userHeader = `<div className="flex items-center gap-3"><div className="text-sm text-right"><p className="font-semibold text-gray-900">{session?.user?.display_name || 'User'}</p><p className="text-xs text-gray-500">{session?.user?.role || 'Role'}</p></div><button onClick={() => setSession(null)} className="text-sm text-blue-600 hover:text-blue-800">Logout</button></div>`;
  code = code.replace(/<div className="flex items-center space-x-3">.*?<\/div>/s, userHeader);

  fs.writeFileSync('src/App.tsx', code);
}
