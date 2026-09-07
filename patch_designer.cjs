const fs = require('fs');
let code = fs.readFileSync('src/components/ReportTemplateDesigner.tsx', 'utf8');

code = code.replace(
  "import { dataRepository } from '@/data';",
  "import { dataRepository } from '@/data';\nimport { invoke } from '@tauri-apps/api/core';"
);

code = code.replace(
  "async function save() {",
  `async function approveTemplate() {
    if (!editingId) return;
    try {
      await invoke('approve_report_template', { request: { id: editingId, approver: draft.owner } });
      const updated = await dataRepository.get('report_templates', editingId);
      if (updated) {
        onMutated({ type: 'update', row: updated as ReportTemplate });
        setDraft(updated as ReportTemplate);
      }
    } catch (e: any) { alert(e.message || 'Error approving template'); }
  }

  async function save() {`
);

code = code.replace(
  "<Save size={16}/>Save Template\n            </button>",
  `<Save size={16}/>Save Template
            </button>
            {editingId && draft.status === 'Draft' && (
               <button onClick={approveTemplate} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
                 Approve
               </button>
            )}`
);

fs.writeFileSync('src/components/ReportTemplateDesigner.tsx', code);
