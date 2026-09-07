const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importSyncCenter = `import { SyncCenter } from './components/SyncCenter';\n`;
if (!code.includes('import { SyncCenter }')) {
  code = importSyncCenter + code;
}

const syncRoute = `<Route path="/sync-center" element={<SyncCenter />} />`;
if (!code.includes('path="/sync-center"')) {
  code = code.replace('<Routes>', `<Routes>\n              ${syncRoute}`);
}

const syncNavLink = `
          <NavLink to="/sync-center" className={({ isActive }) => \`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors \${isActive ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}\`}>
            <Database className="w-5 h-5" />
            <span>Sync Center</span>
          </NavLink>`;
if (!code.includes('to="/sync-center"')) {
  // Insert before the last NavLink or somewhere in the sidebar navigation
  code = code.replace(/<NavLink to="\/settings"[^>]*>[\s\S]*?<\/NavLink>/, match => syncNavLink + "\n" + match);
}

fs.writeFileSync('src/App.tsx', code);
