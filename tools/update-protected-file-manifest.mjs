import { sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  GOVERNANCE_MANIFEST,
  REQUIRED_PROTECTED_FILES,
  repositoryRootFromModule,
  sha256File,
} from './protected-file-integrity.mjs';

const root = repositoryRootFromModule(import.meta.url);
const keyPath = process.env.BUILDTRACK_CODEX_SIGNING_KEY_FILE;
if (!keyPath || !isAbsolute(keyPath) || !existsSync(keyPath)) {
  throw new Error('Codex-only signing key is unavailable; protected baseline was not changed.');
}
const keyRelative = relative(root, keyPath);
if (keyRelative === '' || (!keyRelative.startsWith('..') && !isAbsolute(keyRelative))) {
  throw new Error('Codex signing key must remain outside the repository.');
}
const files = Object.fromEntries(REQUIRED_PROTECTED_FILES.map((path) => {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) throw new Error(`required protected file is missing: ${path}`);
  return [path, sha256File(fullPath)];
}));
const signed = { schema: 1, algorithm: 'SHA-256', authority: 'CODEX_ONLY', files };
const signature = sign(null, Buffer.from(JSON.stringify(signed)), readFileSync(keyPath)).toString('base64');
const manifest = {
  ...signed,
  public_key_file: 'tools/agent-governance-public-key.pem',
  signature,
  authorization_note: 'Execution agents cannot refresh this signed baseline. Only Codex holds the private signing key outside the repository.',
};
writeFileSync(resolve(root, GOVERNANCE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Protected baseline signed for ${REQUIRED_PROTECTED_FILES.length} files.`);
