import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import {
  detectCommandSpoofing,
  loadProtectedManifest,
  resolveTrustedExecutable,
  sha256File,
  verifyProtectedFiles,
} from '../tools/protected-file-integrity.mjs';

test('repository authority manifest is signed and covers every mandatory protected file', () => {
  const root = join(import.meta.dirname, '..');
  const manifest = loadProtectedManifest(root);
  assert.equal(manifest.authority, 'CODEX_ONLY');
  assert.equal(verifyProtectedFiles(root, manifest).result, 'PASS');
});

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'buildtrack-agent-integrity-'));
  mkdirSync(join(root, 'tools'), { recursive: true });
  writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(join(root, 'src-feature.ts'), 'export const allowed = true;\n');
  return root;
};

test('protected integrity rejects package-lock tampering independently of Git', () => {
  const repositoryRoot = join(import.meta.dirname, '..');
  const authorityManifest = loadProtectedManifest(repositoryRoot);
  const root = mkdtempSync(join(tmpdir(), 'buildtrack-signed-integrity-'));
  try {
    for (const path of [...Object.keys(authorityManifest.files), authorityManifest.public_key_file]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(join(repositoryRoot, path), join(root, path));
    }
    mkdirSync(join(root, 'tools'), { recursive: true });
    writeFileSync(join(root, 'tools', 'agent-protected-files.json'), `${JSON.stringify(authorityManifest, null, 2)}\n`);
    const manifest = loadProtectedManifest(root);
    verifyProtectedFiles(root, manifest);
    writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":2}\n');
    assert.throws(() => verifyProtectedFiles(root, manifest), /protected-file integrity failure.*package-lock\.json/is);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a repository-local fake git shim is rejected before Git output is trusted', () => {
  const root = fixture();
  try {
    mkdirSync(join(root, 'tools', 'git-shim'), { recursive: true });
    writeFileSync(join(root, 'tools', 'git-shim', 'git'), '#!/bin/sh\nexit 0\n');
    assert.throws(() => detectCommandSpoofing(root, process.env.PATH || ''), /command-spoofing.*git-shim/is);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('repository-local fake cargo cannot hide a genuine external Cargo executable', () => {
  const root = fixture();
  const external = mkdtempSync(join(tmpdir(), 'buildtrack-real-cargo-'));
  try {
    const localBin = join(root, 'bin');
    mkdirSync(localBin, { recursive: true });
    writeFileSync(join(localBin, 'cargo.exe'), 'fake');
    writeFileSync(join(external, 'cargo.exe'), 'trusted');
    const resolved = resolveTrustedExecutable(root, 'cargo', `${localBin}${delimiter}${external}`, 'win32');
    assert.equal(resolved, join(external, 'cargo.exe'));
    assert.throws(() => detectCommandSpoofing(root, `${localBin}${delimiter}${external}`), /repository-local PATH command override/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(external, { recursive: true, force: true });
  }
});

test('normal allowed feature changes do not invalidate protected baseline hashes', () => {
  const root = fixture();
  try {
    const manifest = { schema: 1, algorithm: 'SHA-256', authority: 'CODEX_ONLY', files: { 'package-lock.json': sha256File(join(root, 'package-lock.json')) } };
    writeFileSync(join(root, 'src-feature.ts'), 'export const allowed = false;\n');
    assert.equal(verifyProtectedFiles(root, manifest).result, 'PASS');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
