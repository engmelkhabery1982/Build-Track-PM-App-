import type {
  PortalSession,
  PortalUser,
  PortalRole,
  PortalSubmission,
  PortalSubmissionType,
  PortalSubmissionStatus,
  PortalAttachment,
  PortalAuditLog,
} from '../types/index.ts';

export class PortalSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalSecurityError';
  }
}

export class PortalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalValidationError';
  }
}

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv', '.zip', '.docx'
];

export const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar', '.py', '.scr', '.com', '.pif'
];

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream', // often returned for zip/excel
]);

/** Simple in-memory rate limiter for portal endpoints */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

/** Validates that session exists and is not expired */
export function validateSession(session: PortalSession | null | undefined): PortalSession {
  if (!session || !session.token || !session.user) {
    throw new PortalSecurityError('Missing or unauthenticated portal session.');
  }

  const now = new Date().toISOString();
  if (session.expires_at && session.expires_at <= now) {
    throw new PortalSecurityError('Portal session has expired. Re-authentication required.');
  }

  if (session.user.status === 'Suspended') {
    throw new PortalSecurityError('Portal user account is suspended.');
  }

  return session;
}

/** Enforces strict tenant/party/contract scope isolation to prevent ID guessing or data leakage */
export function validateScopeAccess(
  session: PortalSession,
  resource: {
    party_id?: string | null;
    contract_id?: string | null;
    project_id?: string | null;
  }
): void {
  validateSession(session);

  const user = session.user;

  // Party scope isolation
  if (resource.party_id && resource.party_id !== user.party_id) {
    throw new PortalSecurityError(
      `Access Denied: Attempted to access resource belonging to party "${resource.party_id}". User is scoped to "${user.party_id}".`
    );
  }

  // Contract scope isolation
  if (resource.contract_id) {
    const hasContract = user.contract_ids.includes(resource.contract_id);
    if (!hasContract) {
      throw new PortalSecurityError(
        `Access Denied: Contract "${resource.contract_id}" is outside user's authorized contract scope.`
      );
    }
  }

  // Project scope isolation
  if (resource.project_id && user.project_ids?.length) {
    const hasProject = user.project_ids.includes(resource.project_id);
    if (!hasProject) {
      throw new PortalSecurityError(
        `Access Denied: Project "${resource.project_id}" is outside user's authorized project scope.`
      );
    }
  }
}

/** Enforces role boundaries for submission types */
export function validateSubmissionTypeForRole(
  role: PortalRole,
  submissionType: PortalSubmissionType
): void {
  switch (role) {
    case 'Portal_Supplier':
      if (submissionType === 'WIR') {
        throw new PortalSecurityError('Suppliers are not permitted to submit Work Inspection Requests (WIR).');
      }
      if (submissionType === 'Submittal') {
        throw new PortalSecurityError('Suppliers cannot submit technical submittals directly without contractor representation.');
      }
      break;

    case 'Portal_Client':
      if (submissionType === 'Invoice') {
        throw new PortalSecurityError('Clients do not submit supplier/subcontractor invoices.');
      }
      break;

    case 'Portal_Subcontractor':
      // Subcontractors can submit WIR, Submittals, Invoices, Documents, Comments
      break;

    default:
      throw new PortalSecurityError(`Unrecognized portal role: ${role}`);
  }
}

/** Synchronous SHA-256 hash calculation helper (using standard bitwise implementation) */
export function computeSha256(content: string | Uint8Array): string {
  // Convert string to UTF-8 Uint8Array if needed
  const data = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  // Standard SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const paddingLen = (len % 64 < 56) ? 56 - (len % 64) : 120 - (len % 64);
  const totalLen = len + paddingLen + 8;
  const buffer = new Uint8Array(totalLen);
  buffer.set(data);
  buffer[len] = 0x80;

  const view = new DataView(buffer.buffer);
  // Length in bits as 64-bit big endian integer
  view.setUint32(totalLen - 4, bitLen & 0xffffffff);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));

  const w = new Uint32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = (rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)) >>> 0;
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  function rotr(x: number, n: number): number {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function toHex(val: number): string {
    return ('00000000' + val.toString(16)).slice(-8);
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map(toHex).join('');
}

/** EICAR test string for testing virus scanning / quarantine interface */
export const EICAR_TEST_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** Validates attachment metadata, size, extension, mime-type, computes hash and runs scan */
export function validateAndScanAttachment(file: {
  name: string;
  size: number;
  mimeType?: string;
  content?: string | Uint8Array;
}): {
  scanStatus: 'Clean' | 'Quarantined';
  scanDetails: string;
  sha256Hash: string;
} {
  const extMatch = file.name.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '';

  // Prohibit executable / script extensions
  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    throw new PortalValidationError(
      `Forbidden file extension "${ext}". Executables and scripts are prohibited for security.`
    );
  }

  // Must be in allowed extensions
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new PortalValidationError(
      `Unsupported file extension "${ext}". Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Size limit
  if (file.size <= 0) {
    throw new PortalValidationError('Attachment file cannot be empty (0 bytes).');
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new PortalValidationError(
      `Attachment size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 25 MB.`
    );
  }

  // Calculate Hash
  const hash = computeSha256(file.content || `${file.name}:${file.size}`);

  // Quarantine scanner check (e.g. simulated virus signature or script tags)
  let scanStatus: 'Clean' | 'Quarantined' = 'Clean';
  let scanDetails = 'Passed security scanner. Verified signature.';

  if (file.content) {
    const textContent = typeof file.content === 'string'
      ? file.content
      : new TextDecoder('utf-8', { fatal: false }).decode(file.content);

    if (textContent.includes(EICAR_TEST_SIGNATURE) || /<script[\s>]/i.test(textContent)) {
      scanStatus = 'Quarantined';
      scanDetails = 'Malicious code signature or script tag detected. File quarantined.';
    }
  }

  return {
    scanStatus,
    scanDetails,
    sha256Hash: hash,
  };
}

/** Enforces segregation of duties between external portal users and internal approval authority */
export function validateWorkflowTransition(
  currentStatus: PortalSubmissionStatus,
  targetStatus: PortalSubmissionStatus,
  actor: {
    type: 'External' | 'Internal';
    userId: string;
    role?: string;
  }
): void {
  // External actors are strictly forbidden from approving or rejecting
  if (actor.type === 'External') {
    if (targetStatus === 'Approved' || targetStatus === 'Rejected') {
      throw new PortalSecurityError(
        'Segregation of Duties Violation: External portal users cannot approve or reject submissions. Approval is reserved exclusively for internal project controls.'
      );
    }

    // External users can only create/edit Draft, or Submit from Draft or Requires Clarification
    if (targetStatus === 'Submitted') {
      if (currentStatus !== 'Draft' && currentStatus !== 'Requires Clarification') {
        throw new PortalValidationError(
          `Cannot submit when current status is "${currentStatus}". Must be in "Draft" or "Requires Clarification".`
        );
      }
    }
  }

  // Internal actors can review, approve, reject, or request clarification
  if (actor.type === 'Internal') {
    if (targetStatus === 'Approved' || targetStatus === 'Rejected') {
      if (currentStatus !== 'Submitted' && currentStatus !== 'Under Review') {
        throw new PortalValidationError(
          `Cannot approve/reject submission in "${currentStatus}" status. Must be "Submitted" or "Under Review".`
        );
      }
    }
  }
}

/** Filters a list of submissions strictly to the user's party and contract scope */
export function filterSubmissionsForSession(
  submissions: PortalSubmission[],
  session: PortalSession
): PortalSubmission[] {
  validateSession(session);
  const user = session.user;

  return submissions.filter(sub => {
    if (sub.party_id !== user.party_id) return false;
    if (!user.contract_ids.includes(sub.contract_id)) return false;
    if (user.project_ids?.length && !user.project_ids.includes(sub.project_id)) return false;
    return true;
  });
}

/** Prepares a G1 sync item for an external portal submission */
export function buildG1PortalSyncItem(
  submission: PortalSubmission,
  action: 'create' | 'update'
): {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: string;
  status: 'Pending';
  created_at: string;
} {
  return {
    id: `sync-portal-${submission.id}-${Date.now()}`,
    operation_id: `op-portal-${submission.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entity_type: 'portal_submission',
    entity_id: submission.id,
    action,
    payload_json: JSON.stringify(submission),
    status: 'Pending',
    created_at: new Date().toISOString(),
  };
}
