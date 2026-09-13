import { createHash, verify as verifySignature } from 'node:crypto';
import { accessSync, constants, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOVERNANCE_MANIFEST = 'tools/agent-protected-files.json';
export const REQUIRED_PROTECTED_FILES = [
  'package.json',
  'package-lock.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  'tools/agent-preflight.mjs',
  'tools/agent-delivery-gate.mjs',
  'tools/protected-file-integrity.mjs',
  'tools/update-protected-file-manifest.mjs',
  'tools/agent-governance-public-key.pem',
  'AGENTS.md',
  'docs/agent-work-orders/ACTIVE.md',
];

export const sha256File = (path) => {
  const canonicalBytes = Buffer.from(readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), 'utf8');
  return createHash('sha256').update(canonicalBytes).digest('hex').toUpperCase();
};

const inside = (root, candidate) => {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
};

export function loadProtectedManifest(root) {
  const path = resolve(root, GOVERNANCE_MANIFEST);
  if (!existsSync(path)) throw new Error(`protected-file manifest is missing: ${GOVERNANCE_MANIFEST}`);
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.schema !== 1 || manifest.algorithm !== 'SHA-256' || manifest.authority !== 'CODEX_ONLY'
    || !manifest.files || typeof manifest.files !== 'object') {
    throw new Error('protected-file manifest is invalid.');
  }
  for (const required of REQUIRED_PROTECTED_FILES) {
    if (!/^[A-F0-9]{64}$/i.test(String(manifest.files[required] || ''))) {
      throw new Error(`protected-file manifest lacks a valid authority hash for ${required}.`);
    }
  }
  if (!manifest.public_key_file || !manifest.signature) throw new Error('protected-file manifest signature metadata is missing.');
  const signedPayload = JSON.stringify({ schema: manifest.schema, algorithm: manifest.algorithm, authority: manifest.authority, files: manifest.files });
  const publicKeyPath = resolve(root, manifest.public_key_file);
  if (!existsSync(publicKeyPath) || !verifySignature(null, Buffer.from(signedPayload), readFileSync(publicKeyPath), Buffer.from(manifest.signature, 'base64'))) {
    throw new Error('protected-file authority signature is invalid.');
  }
  return manifest;
}

export function verifyProtectedFiles(root, manifest = loadProtectedManifest(root)) {
  const failures = [];
  for (const [relativePath, expected] of Object.entries(manifest.files)) {
    const fullPath = resolve(root, relativePath);
    if (!inside(root, fullPath)) failures.push(`${relativePath}: path escapes repository`);
    else if (!existsSync(fullPath)) failures.push(`${relativePath}: missing`);
    else {
      const actual = sha256File(fullPath);
      if (actual !== String(expected).toUpperCase()) failures.push(`${relativePath}: SHA-256 ${actual} != ${expected}`);
    }
  }
  if (failures.length) throw new Error(`protected-file integrity failure:\n${failures.join('\n')}`);
  return { result: 'PASS', checked: Object.keys(manifest.files).length, authority: manifest.authority };
}

const skippedDirectories = new Set(['.git', 'node_modules', 'dist', 'target', '.vite']);
const spoofSegment = /(^|[\\/])(git|cargo|command)[-_]?shim(s)?([\\/]|$)/i;
const spoofExecutable = /(^|[\\/])(git|cargo)(\.exe|\.cmd|\.bat|\.ps1|\.sh)?$/i;

export function detectCommandSpoofing(root, pathValue = process.env.PATH || '') {
  const findings = [];
  for (const entry of pathValue.split(delimiter).map((value) => value.trim()).filter(Boolean)) {
    if (inside(root, entry)) {
      const commandNames = process.platform === 'win32'
        ? ['git.exe', 'git.cmd', 'git.bat', 'cargo.exe', 'cargo.cmd', 'cargo.bat']
        : ['git', 'cargo'];
      if (commandNames.some((name) => existsSync(resolve(entry, name)))) {
        findings.push(`repository-local PATH command override: ${entry}`);
      }
    }
  }
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
      const full = resolve(directory, entry.name);
      const rel = relative(root, full).replaceAll('\\', '/');
      if (spoofSegment.test(rel) || (spoofExecutable.test(rel) && rel.includes('/'))) findings.push(rel);
      if (entry.isDirectory() && !spoofSegment.test(rel)) visit(full);
    }
  };
  visit(root);
  if (findings.length) throw new Error(`local command-spoofing detected:\n${[...new Set(findings)].join('\n')}`);
  return { result: 'PASS' };
}

export function trustedExecutableCandidates(root, command, pathValue = process.env.PATH || '', platform = process.platform) {
  const suffixes = platform === 'win32' ? ['.exe'] : [''];
  const candidates = [];
  for (const entry of pathValue.split(delimiter).map((value) => value.trim()).filter(Boolean)) {
    if (inside(root, entry)) continue;
    for (const suffix of suffixes) {
      const candidate = resolve(entry, `${command}${suffix}`);
      if (!existsSync(candidate) || inside(root, candidate)) continue;
      try {
        if (!statSync(candidate).isFile()) continue;
        if (platform !== 'win32') accessSync(candidate, constants.X_OK);
        candidates.push(candidate);
      } catch { /* not an executable candidate */ }
    }
  }
  return [...new Set(candidates)];
}

export function resolveTrustedExecutable(root, command, pathValue = process.env.PATH || '', platform = process.platform) {
  return trustedExecutableCandidates(root, command, pathValue, platform)[0] || null;
}

export function repositoryRootFromModule(moduleUrl = import.meta.url) {
  return resolve(dirname(fileURLToPath(moduleUrl)), '..');
}
