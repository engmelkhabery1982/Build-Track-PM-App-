const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { DataEntryWorkspace } from '@/components/DataEntryWorkspace';",
  "import { DataEntryWorkspace } from '@/components/DataEntryWorkspace';\nimport { DataQualityChecks } from '@/components/DataQualityChecks';"
);

code = code.replace(
  "if (activeView === 'dataEntry') {",
  `if (activeView === 'dataQuality') {
      return <DataQualityChecks rules={data.dqRules || []} logs={data.dqExecutionLogs || []} globalData={data} onMutated={data.applyLocalMutation} />;
    }
    if (activeView === 'dataEntry') {`
);

code = code.replace(
  "<button onClick={() => setActiveView('reportTemplates')}",
  `<button onClick={() => setActiveView('dataQuality')} className={\`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors \${activeView === 'dataQuality' ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}\`}>
              <ShieldAlert size={18} />
              Data Quality
            </button>
            <button onClick={() => setActiveView('reportTemplates')}`
);

fs.writeFileSync('src/App.tsx', code);
