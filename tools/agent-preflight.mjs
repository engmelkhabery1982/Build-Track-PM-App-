import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  detectCommandSpoofing,
  repositoryRootFromModule,
  resolveTrustedExecutable,
  verifyProtectedFiles,
} from './protected-file-integrity.mjs';

const fail = (message) => { throw new Error(`PREFLIGHT FAIL: ${message}`); };
const root = repositoryRootFromModule(import.meta.url);
process.chdir(root);
try {
  verifyProtectedFiles(root);
  detectCommandSpoofing(root);
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
const gitExecutable = resolveTrustedExecutable(root, 'git');
if (!gitExecutable) fail('trusted external Git executable is unavailable.');
const run = (args = []) => execFileSync(gitExecutable, args, { encoding: 'utf8', shell: false, cwd: root }).trim();

const activePath = resolve(root, 'docs/agent-work-orders/ACTIVE.md');
if (!existsSync(activePath)) fail('ACTIVE.md is missing.');
const active = Object.fromEntries(readFileSync(activePath, 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map((match) => [match[1], match[2].trim()]));
const queueMode = active.EXECUTION_MODE === 'OPEN_SEQUENTIAL_CANDIDATE_QUEUE';
const freezeMode = active.EXECUTION_MODE === 'OPERATIONAL_RELIABILITY_FREEZE';
const flexibleExecutionMode = queueMode || freezeMode;

for (const key of ['ACCEPTED_HEAD', 'CLOUD_BASE_BRANCH', 'DELIVERY_BRANCH', 'CURRENT_FEATURE', 'MODIFY_ALLOWLIST', 'FORBIDDEN']) {
  if (!active[key]) fail(`ACTIVE.${key} is missing.`);
}
for (const key of ['CORRECTION_FILE', 'EXECUTION_PLAN_FILE']) {
  if (active[key] && !existsSync(resolve(root, active[key]))) fail(`ACTIVE.${key} points to missing file: ${active[key]}`);
}

const status = run(['status', '--porcelain=v1', '--untracked-files=all']);
if (status) fail(`working tree is not clean.\n${status}`);
const head = run(['rev-parse', 'HEAD']);
const branch = run(['branch', '--show-current']);
const patternText = active.WORK_BRANCH_PATTERN || `^${active.DELIVERY_BRANCH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
let pattern;
try { pattern = new RegExp(patternText); } catch { fail(`invalid WORK_BRANCH_PATTERN: ${patternText}`); }
if (!pattern.test(branch) && !flexibleExecutionMode) fail(`current branch '${branch}' does not match WORK_BRANCH_PATTERN '${patternText}'.`);
let lineage_verification = 'ANCESTOR';
try {
  run(['cat-file', '-e', `${active.ACCEPTED_HEAD}^{commit}`]);
  run(['merge-base', '--is-ancestor', active.ACCEPTED_HEAD, head]);
} catch {
  if (active.ACCEPTED_LINEAGE_MODE !== 'ANCESTOR_OR_REMOTE_MAIN_ATTESTATION') {
    fail(`HEAD ${head} is not based on accepted ${active.ACCEPTED_HEAD}.`);
  }
  let remoteHead;
  try { remoteHead = run(['rev-parse', `origin/${active.CLOUD_BASE_BRANCH}`]); }
  catch { fail(`accepted commit is absent and origin/${active.CLOUD_BASE_BRANCH} cannot be verified.`); }
  if (remoteHead !== head && !flexibleExecutionMode) fail(`accepted history is shallow and HEAD ${head} does not equal pulled origin/${active.CLOUD_BASE_BRANCH} ${remoteHead}.`);
  const attestationRelative = active.ACCEPTED_ATTESTATION_FILE;
  const expectedHash = active.ACCEPTED_ATTESTATION_SHA256;
  if (!attestationRelative || !expectedHash) fail('shallow verification requires ACCEPTED_ATTESTATION_FILE and SHA256.');
  const attestationPath = resolve(root, attestationRelative);
  if (!existsSync(attestationPath)) fail(`accepted attestation is missing: ${attestationRelative}`);
  const canonicalContent = readFileSync(attestationPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const actualHash = createHash('sha256').update(canonicalContent, 'utf8').digest('hex').toUpperCase();
  if (actualHash !== expectedHash.toUpperCase()) fail(`accepted attestation hash mismatch: ${attestationRelative}`);
  lineage_verification = 'REMOTE_MAIN_ATTESTATION';
}

for (const path of ['AGENTS.md', 'docs/agent-work-orders/AGENT_START_HERE_AR.md', 'docs/agent-work-orders/ACTIVE.md',
  'docs/agent-work-orders/NEXT_WEEK_90_FEATURES_EXECUTION_PLAN_AR.md', 'docs/agent-work-orders/FEATURE_READ_PACKS_AR.md',
  'docs/agent-work-orders/COMPACT_PROJECT_MODEL_AR.md', 'docs/agent-work-orders/OPEN_90_FEATURE_EXECUTION_SYSTEM_AR.md',
  'docs/agent-work-orders/OPERATIONAL_RELIABILITY_FREEZE_MASTER_PLAN_AR.md',
  'docs/agent-work-orders/OPERATIONAL_RELIABILITY_READ_PACKS_AR.md',
  'docs/agent-work-orders/OPERATIONAL_ACCEPTANCE_GOLDEN_SCENARIO_AR.md',
  'docs/agent-work-orders/UNIVERSAL_STABILIZATION_AGENT_PROMPT_V4_AR.md',
  'tools/agent-delivery-gate.mjs', 'tools/protected-file-integrity.mjs',
  'tools/agent-protected-files.json', 'tools/agent-governance-public-key.pem']) {
  if (!existsSync(resolve(root, path))) fail(`required file missing: ${path}`);
}

console.log(JSON.stringify({ result: 'PASS', repository: root, branch,
  required_base_branch: active.CLOUD_BASE_BRANCH, delivery_target: active.DELIVERY_BRANCH,
  head, accepted_ancestor: active.ACCEPTED_HEAD, lineage_verification, feature: active.CURRENT_FEATURE,
  execution_mode: active.EXECUTION_MODE || 'SINGLE_FEATURE', open_feature_range: active.OPEN_FEATURE_RANGE || null,
  current_executor: active.CURRENT_EXECUTOR || null, new_feature_development: active.NEW_FEATURE_DEVELOPMENT || null,
  correction_file: active.CORRECTION_FILE || null, execution_plan_file: active.EXECUTION_PLAN_FILE || null,
  modify_allowlist: active.MODIFY_ALLOWLIST.split('|'), conditional_modify: (active.CONDITIONAL_MODIFY || '').split('|').filter(Boolean) }, null, 2));
