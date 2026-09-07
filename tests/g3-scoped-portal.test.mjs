import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateSession,
  validateScopeAccess,
  validateSubmissionTypeForRole,
  validateAndScanAttachment,
  validateWorkflowTransition,
  filterSubmissionsForSession,
  checkRateLimit,
  resetRateLimits,
  computeSha256,
  buildG1PortalSyncItem,
  PortalSecurityError,
  PortalValidationError,
  EICAR_TEST_SIGNATURE,
} from '../src/utils/portalEngine.ts';

const tauriLibPath = new URL('../src-tauri/src/lib.rs', import.meta.url);

const mockSessionSubcontractor = {
  token: 'tok-sub-valid-12345',
  user: {
    id: 'usr-sub-01',
    username: 'albawani_sub',
    display_name: 'Al-Bawani Subcontractor Team',
    email: 'sub@albawani.test',
    party_id: 'party-sub-01',
    party_type: 'Subcontractor',
    contract_ids: ['SC-FOUNDATION-01', 'SC-EARTHWORKS-02'],
    project_ids: ['PRJ-NEOM-01'],
    role: 'Portal_Subcontractor',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  expires_at: '2099-01-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
};

const mockSessionSupplier = {
  token: 'tok-supp-valid-67890',
  user: {
    id: 'usr-supp-01',
    username: 'apex_concrete',
    display_name: 'Apex ReadyMix Supplies',
    email: 'apex@readymix.test',
    party_id: 'party-supp-01',
    party_type: 'Supplier',
    contract_ids: ['PO-CONCRETE-01'],
    project_ids: ['PRJ-NEOM-01'],
    role: 'Portal_Supplier',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  expires_at: '2099-01-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
};

const mockSessionClient = {
  token: 'tok-client-valid-99999',
  user: {
    id: 'usr-client-01',
    username: 'mot_rep',
    display_name: 'Client Representative',
    email: 'rep@client.test',
    party_id: 'party-client-01',
    party_type: 'Client',
    contract_ids: ['SC-FOUNDATION-01'],
    project_ids: ['PRJ-NEOM-01'],
    role: 'Portal_Client',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  expires_at: '2099-01-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
};

test('G3 — Session Validation: accepts active session, rejects expired and suspended sessions', () => {
  // 1. Valid session passes
  const valid = validateSession(mockSessionSubcontractor);
  assert.equal(valid.user.id, 'usr-sub-01');

  // 2. Expired session rejected
  const expiredSession = {
    ...mockSessionSubcontractor,
    expires_at: '2020-01-01T00:00:00Z',
  };
  assert.throws(
    () => validateSession(expiredSession),
    (err) => err instanceof PortalSecurityError && err.message.includes('expired')
  );

  // 3. Suspended account rejected
  const suspendedSession = {
    ...mockSessionSubcontractor,
    user: { ...mockSessionSubcontractor.user, status: 'Suspended' },
  };
  assert.throws(
    () => validateSession(suspendedSession),
    (err) => err instanceof PortalSecurityError && err.message.includes('suspended')
  );

  // 4. Missing or null session rejected
  assert.throws(
    () => validateSession(null),
    (err) => err instanceof PortalSecurityError && err.message.includes('Missing or unauthenticated')
  );
});

test('G3 — Scope Isolation & Guessed IDs: strictly confines access to assigned party and contracts', () => {
  // 1. Matching party and contract succeeds
  assert.doesNotThrow(() => {
    validateScopeAccess(mockSessionSubcontractor, {
      party_id: 'party-sub-01',
      contract_id: 'SC-FOUNDATION-01',
      project_id: 'PRJ-NEOM-01',
    });
  });

  // 2. Cross-Party isolation: accessing another party's resource fails immediately
  assert.throws(
    () => {
      validateScopeAccess(mockSessionSubcontractor, {
        party_id: 'party-sub-OTHER',
        contract_id: 'SC-FOUNDATION-01',
      });
    },
    (err) => err instanceof PortalSecurityError && err.message.includes('party-sub-OTHER')
  );

  // 3. Guessed Contract ID: attempting to access unassigned contract under own party fails
  assert.throws(
    () => {
      validateScopeAccess(mockSessionSubcontractor, {
        party_id: 'party-sub-01',
        contract_id: 'SC-UNAUTHORIZED-99',
      });
    },
    (err) => err instanceof PortalSecurityError && err.message.includes('SC-UNAUTHORIZED-99')
  );

  // 4. Guessed Project ID outside authorized projects fails
  assert.throws(
    () => {
      validateScopeAccess(mockSessionSubcontractor, {
        party_id: 'party-sub-01',
        contract_id: 'SC-FOUNDATION-01',
        project_id: 'PRJ-SECRET-RED-SEA',
      });
    },
    (err) => err instanceof PortalSecurityError && err.message.includes('PRJ-SECRET-RED-SEA')
  );
});

test('G3 — Role Boundaries: enforces submission capabilities per portal role', () => {
  // 1. Supplier cannot submit WIR (Work Inspection Request)
  assert.throws(
    () => validateSubmissionTypeForRole('Portal_Supplier', 'WIR'),
    (err) => err instanceof PortalSecurityError && err.message.includes('Suppliers are not permitted to submit Work Inspection Requests')
  );

  // 2. Supplier cannot submit direct Submittal without contractor representation
  assert.throws(
    () => validateSubmissionTypeForRole('Portal_Supplier', 'Submittal'),
    (err) => err instanceof PortalSecurityError && err.message.includes('Suppliers cannot submit technical submittals directly')
  );

  // 3. Client cannot submit Invoices
  assert.throws(
    () => validateSubmissionTypeForRole('Portal_Client', 'Invoice'),
    (err) => err instanceof PortalSecurityError && err.message.includes('Clients do not submit supplier/subcontractor invoices')
  );

  // 4. Subcontractor can submit WIR, Invoices, Submittals, Documents
  assert.doesNotThrow(() => validateSubmissionTypeForRole('Portal_Subcontractor', 'WIR'));
  assert.doesNotThrow(() => validateSubmissionTypeForRole('Portal_Subcontractor', 'Invoice'));
  assert.doesNotThrow(() => validateSubmissionTypeForRole('Portal_Subcontractor', 'Submittal'));
  assert.doesNotThrow(() => validateSubmissionTypeForRole('Portal_Subcontractor', 'Document'));
});

test('G3 — Attachment Validation & Quarantine: rejects scripts, enforces size limits, scans content', () => {
  // 1. Executable / script extensions prohibited
  for (const badExt of ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar']) {
    assert.throws(
      () => validateAndScanAttachment({ name: `malicious${badExt}`, size: 1024 }),
      (err) => err instanceof PortalValidationError && err.message.includes('Forbidden file extension')
    );
  }

  // 2. Size limits: Reject empty files and files > 25MB
  assert.throws(
    () => validateAndScanAttachment({ name: 'empty.pdf', size: 0 }),
    (err) => err instanceof PortalValidationError && err.message.includes('cannot be empty')
  );

  assert.throws(
    () => validateAndScanAttachment({ name: 'huge_cad.zip', size: 26 * 1024 * 1024 }),
    (err) => err instanceof PortalValidationError && err.message.includes('exceeds the maximum allowed limit of 25 MB')
  );

  // 3. Clean allowed file succeeds with verified SHA-256 hash
  const cleanResult = validateAndScanAttachment({
    name: 'structural_drawing.pdf',
    size: 2048,
    content: '%PDF-1.4 Mock drawing header content',
  });
  assert.equal(cleanResult.scanStatus, 'Clean');
  assert.ok(cleanResult.sha256Hash && cleanResult.sha256Hash.length === 64);

  // 4. Quarantine interface: EICAR test virus or embedded script tags trigger quarantine
  const quarantineEicar = validateAndScanAttachment({
    name: 'test_virus.pdf',
    size: 1024,
    content: EICAR_TEST_SIGNATURE,
  });
  assert.equal(quarantineEicar.scanStatus, 'Quarantined');
  assert.match(quarantineEicar.scanDetails, /Malicious code signature or script tag detected/);

  const quarantineScript = validateAndScanAttachment({
    name: 'report.docx',
    size: 1024,
    content: '<script>alert("xss")</script>',
  });
  assert.equal(quarantineScript.scanStatus, 'Quarantined');
});

test('G3 — Segregation of Duties: external actors are strictly forbidden from approving submissions', () => {
  // 1. External actor attempting to approve throws security violation
  assert.throws(
    () => {
      validateWorkflowTransition('Submitted', 'Approved', {
        type: 'External',
        userId: 'usr-sub-01',
      });
    },
    (err) => err instanceof PortalSecurityError && err.message.includes('Segregation of Duties Violation')
  );

  // 2. External actor attempting to reject throws security violation
  assert.throws(
    () => {
      validateWorkflowTransition('Submitted', 'Rejected', {
        type: 'External',
        userId: 'usr-sub-01',
      });
    },
    (err) => err instanceof PortalSecurityError && err.message.includes('Segregation of Duties Violation')
  );

  // 3. External actor cannot jump from Approved to Submitted
  assert.throws(
    () => {
      validateWorkflowTransition('Approved', 'Submitted', {
        type: 'External',
        userId: 'usr-sub-01',
      });
    },
    (err) => err instanceof PortalValidationError && err.message.includes('Cannot submit when current status is "Approved"')
  );

  // 4. Internal project control actor CAN approve from Submitted or Under Review
  assert.doesNotThrow(() => {
    validateWorkflowTransition('Submitted', 'Approved', {
      type: 'Internal',
      userId: 'usr-int-pmo',
    });
  });

  assert.doesNotThrow(() => {
    validateWorkflowTransition('Under Review', 'Rejected', {
      type: 'Internal',
      userId: 'usr-int-pmo',
    });
  });
});

test('G3 — Data Leakage & Submission Filtering: strictly filters list to authorized party and contracts', () => {
  const allSubmissions = [
    {
      id: 's-1',
      tenant_id: 't-1',
      party_id: 'party-sub-01',
      contract_id: 'SC-FOUNDATION-01',
      project_id: 'PRJ-NEOM-01',
      submission_type: 'WIR',
      reference_number: 'WIR-1',
      title: 'Foundation WIR',
      status: 'Submitted',
      submitted_by: 'Ahmed',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 's-2',
      tenant_id: 't-1',
      party_id: 'party-supp-01', // Different party!
      contract_id: 'PO-CONCRETE-01',
      project_id: 'PRJ-NEOM-01',
      submission_type: 'Invoice',
      reference_number: 'INV-1',
      title: 'Concrete Invoice',
      status: 'Submitted',
      submitted_by: 'Kareem',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 's-3',
      tenant_id: 't-1',
      party_id: 'party-sub-01',
      contract_id: 'SC-UNAUTHORIZED-99', // Different contract!
      project_id: 'PRJ-NEOM-01',
      submission_type: 'Submittal',
      reference_number: 'SUB-3',
      title: 'Unassigned Contract Submittal',
      status: 'Submitted',
      submitted_by: 'Ahmed',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  const filtered = filterSubmissionsForSession(allSubmissions, mockSessionSubcontractor);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 's-1');
  assert.equal(filtered[0].party_id, 'party-sub-01');
  assert.equal(filtered[0].contract_id, 'SC-FOUNDATION-01');
});

test('G3 — Rate Limiting: prevents abusive or repetitive submissions', () => {
  resetRateLimits();
  const key = 'test-portal-rate-limit';

  // Allow up to 3 requests in window
  for (let i = 0; i < 3; i++) {
    const res = checkRateLimit(key, 3, 5000);
    assert.equal(res.allowed, true);
  }

  // 4th request must be rejected
  const blocked = checkRateLimit(key, 3, 5000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test('G3 — G1 Protocol Integration & Migration 71: enqueues outbox without direct SQLite desktop write', async () => {
  // 1. Build G1 sync outbox payload
  const testSub = {
    id: 'sub-sync-test-99',
    tenant_id: 't-1',
    party_id: 'party-sub-01',
    contract_id: 'SC-FOUNDATION-01',
    project_id: 'PRJ-NEOM-01',
    submission_type: 'WIR',
    reference_number: 'WIR-99',
    title: 'WIR Test Sync',
    status: 'Submitted',
    submitted_by: 'Eng. Sub',
    created_at: '2026-09-07T00:00:00Z',
    updated_at: '2026-09-07T00:00:00Z',
  };

  const syncItem = buildG1PortalSyncItem(testSub, 'create');
  assert.ok(syncItem.id.startsWith('sync-portal-sub-sync-test-99'));
  assert.equal(syncItem.entity_type, 'portal_submission');
  assert.equal(syncItem.entity_id, 'sub-sync-test-99');
  assert.equal(syncItem.status, 'Pending');
  assert.ok(syncItem.payload_json.includes('WIR Test Sync'));

  // 2. Verify Migration 71 in src-tauri/src/lib.rs defines portal_outbox and portal_audit_log
  const source = await readFile(tauriLibPath, 'utf8');
  assert.match(source, /add_g3_portal_outbox_tables/, 'lib.rs must include Migration 71 for portal outbox.');
  assert.match(source, /CREATE TABLE IF NOT EXISTS portal_outbox/, 'portal_outbox table must exist in Migration 71.');
  assert.match(source, /CREATE TABLE IF NOT EXISTS portal_audit_log/, 'portal_audit_log table must exist in Migration 71.');
});
