const fs = require('fs');
let code = fs.readFileSync('src/components/ReportTemplateDesigner.tsx', 'utf8');

code = code.replace(
  "const updated = await dataRepository.get('report_templates', editingId);",
  "const list = await dataRepository.list('report_templates'); const updated = list.find((r: any) => r.id === editingId);"
);

fs.writeFileSync('src/components/ReportTemplateDesigner.tsx', code);
