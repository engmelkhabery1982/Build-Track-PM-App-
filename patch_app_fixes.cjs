const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The main return block was modified incorrectly, fix it
code = code.replace("if (!session) return <LoginScreen onLogin={setSession} />;", "");
code = code.replace("return (\n    <ProjectDataDateProvider", "if (!session) return <LoginScreen onLogin={setSession} />;\n\n  return (\n    <ProjectDataDateProvider");

fs.writeFileSync('src/App.tsx', code);
