import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]]); return pairs;
}, []));
const fail = (message) => { throw new Error(`DELIVERY FAIL: ${message}`); };
const execute = (command, args = []) => {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  return { name: [command, ...args].join(' '), exit_code: result.status ?? 127,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim() };
};
const git = (...args) => { const result = execute('git', args); if (result.exit_code) fail(result.output); return result.output; };
const root = git('rev-parse', '--show-toplevel'); process.chdir(root);
const active = Object.fromEntries(readFileSync(resolve(root, 'docs/agent-work-orders/ACTIVE.md'), 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const feature = argv.feature; const startHead = argv['start-head'];
if (!feature || !startHead) fail('use --start-head <commit> --feature <Wxx>.');
if (feature !== active.CURRENT_FEATURE) fail(`requested ${feature} but ACTIVE selects ${active.CURRENT_FEATURE}.`);
git('cat-file', '-e', `${startHead}^{commit}`);

const resultRelative = `docs/agent-results/${feature}_RESULT.md`;
const resultPath = resolve(root, resultRelative);
if (!existsSync(resultPath)) fail(`missing required ${feature}_RESULT.md.`);
const report = readFileSync(resultPath, 'utf8');
if (!/READY FOR CODEX REVIEW/.test(report)) fail('result must declare READY FOR CODEX REVIEW.');
if (/\bCLOSED\b|8\s*\/\s*10/i.test(report)) fail('agents cannot self-declare CLOSED or 8/10.');
for (const gap of (active.REQUIRED_GAPS || '').split('|').filter(Boolean)) {
  const pattern = new RegExp(`^\\s*${gap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=PASS\\s*$`, 'mi');
  if (!pattern.test(report)) fail(`result must contain the exact independent gate line '${gap}=PASS'.`);
}

const allowed = new Set(active.MODIFY_ALLOWLIST.split('|'));
const conditional = new Set((active.CONDITIONAL_MODIFY || '').split('|').filter(Boolean));
for (const path of (argv['allow-conditional'] || '').split(',').filter(Boolean)) {
  if (!conditional.has(path)) fail(`conditional file is not declared: ${path}`); allowed.add(path);
}
const tracked = git('diff', '--name-status', startHead).split(/\r?\n/).filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split(/\r?\n/).filter(Boolean).map((p) => `A\t${p}`);
const changes = [...tracked, ...untracked];
for (const line of changes) {
  const parts = line.split('\t'); const status = parts[0]; const path = parts.at(-1).replaceAll('\\', '/');
  if (/^[DR]/.test(status)) fail(`delete/rename forbidden: ${line}`);
  if (!allowed.has(path)) fail(`outside MODIFY_ALLOWLIST: ${path}`);
  for (const forbidden of active.FORBIDDEN.split('|').filter(Boolean)) {
    const regex = new RegExp(`^${forbidden.split('**').map((part) => part.split('*').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*')}$`);
    if (regex.test(path)) fail(`protected path: ${path}`);
  }
  if (/(^|\/)(node_modules|dist|target)(\/|$)|\.(zip|db|sqlite|sqlite3)$/i.test(path)) fail(`artifact forbidden: ${path}`);
}

const commands = [execute('npm', ['test']), execute('npm', ['run', 'build']),
  execute('cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml']), execute('git', ['diff', '--check', startHead])];
const hashes = changes.map((line) => line.split('\t').at(-1).replaceAll('\\', '/')).filter((path) => existsSync(resolve(root, path)))
  .map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex').toUpperCase() }));
const evidenceRelative = `docs/agent-results/${feature}_EVIDENCE.json`;
const evidence = { feature, result: commands.every((item) => item.exit_code === 0) ? 'PASS' : 'FAIL', start_head: startHead,
  end_head: git('rev-parse', 'HEAD'), generated_utc: new Date().toISOString(), changes: [...changes, `A\t${evidenceRelative}`],
  file_hashes: hashes, commands };
writeFileSync(resolve(root, evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
if (evidence.result !== 'PASS') process.exit(1);
