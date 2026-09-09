import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const run = (command, args = []) => execFileSync(command, args, { encoding: 'utf8' }).trim();
const fail = (message) => { throw new Error(`PREFLIGHT FAIL: ${message}`); };
const root = run('git', ['rev-parse', '--show-toplevel']);
process.chdir(root);

const activePath = resolve(root, 'docs/agent-work-orders/ACTIVE.md');
if (!existsSync(activePath)) fail('ACTIVE.md is missing.');
const active = Object.fromEntries(readFileSync(activePath, 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
  .map((match) => [match[1], match[2].trim()]));

for (const key of ['ACCEPTED_HEAD', 'CLOUD_BASE_BRANCH', 'DELIVERY_BRANCH', 'CURRENT_FEATURE', 'MODIFY_ALLOWLIST', 'FORBIDDEN']) {
  if (!active[key]) fail(`ACTIVE.${key} is missing.`);
}
for (const key of ['CORRECTION_FILE', 'EXECUTION_PLAN_FILE']) {
  if (active[key] && !existsSync(resolve(root, active[key]))) fail(`ACTIVE.${key} points to missing file: ${active[key]}`);
}

const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all']);
if (status) fail(`working tree is not clean.\n${status}`);
const head = run('git', ['rev-parse', 'HEAD']);
const branch = run('git', ['branch', '--show-current']);
const patternText = active.WORK_BRANCH_PATTERN || `^${active.DELIVERY_BRANCH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
let pattern;
try { pattern = new RegExp(patternText); } catch { fail(`invalid WORK_BRANCH_PATTERN: ${patternText}`); }
if (!pattern.test(branch)) fail(`current branch '${branch}' does not match WORK_BRANCH_PATTERN '${patternText}'.`);
try { run('git', ['merge-base', '--is-ancestor', active.ACCEPTED_HEAD, head]); }
catch { fail(`HEAD ${head} is not based on accepted ${active.ACCEPTED_HEAD}.`); }

for (const path of ['AGENTS.md', 'docs/agent-work-orders/AGENT_START_HERE_AR.md', 'docs/agent-work-orders/ACTIVE.md',
  'docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md', 'docs/agent-work-orders/FEATURE_READ_PACKS_AR.md',
  'tools/agent-delivery-gate.mjs']) {
  if (!existsSync(resolve(root, path))) fail(`required file missing: ${path}`);
}

console.log(JSON.stringify({ result: 'PASS', repository: root, branch,
  required_base_branch: active.CLOUD_BASE_BRANCH, delivery_target: active.DELIVERY_BRANCH,
  head, accepted_ancestor: active.ACCEPTED_HEAD, feature: active.CURRENT_FEATURE,
  correction_file: active.CORRECTION_FILE || null, execution_plan_file: active.EXECUTION_PLAN_FILE || null,
  modify_allowlist: active.MODIFY_ALLOWLIST.split('|'), conditional_modify: (active.CONDITIONAL_MODIFY || '').split('|').filter(Boolean) }, null, 2));
