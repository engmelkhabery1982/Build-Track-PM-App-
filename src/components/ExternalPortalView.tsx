import React, { useState, useMemo } from 'react';
import {
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Send,
  MessageSquare,
  Lock,
  FileCheck,
  Paperclip,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  X,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import type {
  PortalSession,
  PortalUser,
  PortalSubmission,
  PortalSubmissionType,
  PortalSubmissionStatus,
  PortalAttachment,
  PortalComment,
} from '../types/index.ts';
import {
  validateAndScanAttachment,
  validateScopeAccess,
  validateSubmissionTypeForRole,
  validateWorkflowTransition,
  filterSubmissionsForSession,
  checkRateLimit,
  buildG1PortalSyncItem,
  PortalSecurityError,
  PortalValidationError,
} from '../utils/portalEngine.ts';

// Sample pre-populated mock submissions for demonstration and preview
const INITIAL_SUBMISSIONS: PortalSubmission[] = [
  {
    id: 'sub-001',
    tenant_id: 'tenant-sa-01',
    party_id: 'party-sub-01',
    contract_id: 'SC-FOUNDATION-01',
    project_id: 'PRJ-NEOM-NORTH',
    submission_type: 'WIR',
    reference_number: 'WIR-SC-2026-0042',
    title: 'Work Inspection Request: Raft Foundation Pour Zone B',
    description: 'Post-bar placement and formwork inspection prior to ready-mix pour.',
    status: 'Submitted',
    internal_approval_status: 'Pending',
    submitted_by: 'Ahmed Al-Subai (Lead Site Engineer)',
    submitted_at: '2026-09-06T14:30:00Z',
    created_at: '2026-09-06T12:00:00Z',
    updated_at: '2026-09-06T14:30:00Z',
    attachments: [
      {
        id: 'att-001',
        file_name: 'Zone_B_Rebar_Checklist.pdf',
        file_size_bytes: 2450000,
        mime_type: 'application/pdf',
        sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        version: 1,
        scan_status: 'Clean',
        scan_details: 'Passed security scanner. Verified signature.',
        uploaded_by: 'Ahmed Al-Subai',
        uploaded_at: '2026-09-06T14:25:00Z',
      },
      {
        id: 'att-002',
        file_name: 'Cover_Thickness_Survey.xlsx',
        file_size_bytes: 540000,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        version: 1,
        scan_status: 'Clean',
        scan_details: 'Passed security scanner. Verified signature.',
        uploaded_by: 'Ahmed Al-Subai',
        uploaded_at: '2026-09-06T14:28:00Z',
      },
    ],
    comments: [
      {
        id: 'comm-001',
        submission_id: 'sub-001',
        author_id: 'usr-sub-01',
        author_name: 'Ahmed Al-Subai',
        author_type: 'External',
        content: 'Ready for consultant site inspection scheduled for tomorrow 09:00 AM.',
        created_at: '2026-09-06T14:30:00Z',
      },
    ],
  },
  {
    id: 'sub-002',
    tenant_id: 'tenant-sa-01',
    party_id: 'party-sub-01',
    contract_id: 'SC-FOUNDATION-01',
    project_id: 'PRJ-NEOM-NORTH',
    submission_type: 'Invoice',
    reference_number: 'INV-SC-2026-008',
    title: 'Progress Claim Payment Certificate #3 Supporting Invoice',
    description: 'Invoice for 35% milestone earthworks and blinding concrete.',
    status: 'Requires Clarification',
    internal_approval_status: 'Pending',
    internal_reviewer: 'Eng. Fahad (Commercial Manager)',
    internal_comments: 'Please attach the certified quantity survey sign-off for Item 3.2.',
    submitted_by: 'Tariq Mansoor (Finance Controller)',
    submitted_at: '2026-09-04T10:15:00Z',
    created_at: '2026-09-04T09:00:00Z',
    updated_at: '2026-09-05T16:00:00Z',
    attachments: [
      {
        id: 'att-003',
        file_name: 'Tax_Invoice_INV008.pdf',
        file_size_bytes: 1850000,
        mime_type: 'application/pdf',
        sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        version: 1,
        scan_status: 'Clean',
        scan_details: 'Passed security scanner.',
        uploaded_by: 'Tariq Mansoor',
        uploaded_at: '2026-09-04T10:10:00Z',
      },
    ],
    comments: [
      {
        id: 'comm-002',
        submission_id: 'sub-002',
        author_id: 'usr-int-04',
        author_name: 'Eng. Fahad (Commercial Manager)',
        author_type: 'Internal',
        content: 'Please attach the certified quantity survey sign-off for Item 3.2 before final approval.',
        created_at: '2026-09-05T16:00:00Z',
      },
    ],
  },
  {
    id: 'sub-003',
    tenant_id: 'tenant-sa-01',
    party_id: 'party-supp-01',
    contract_id: 'PO-CONCRETE-2026-11',
    project_id: 'PRJ-NEOM-NORTH',
    submission_type: 'Invoice',
    reference_number: 'SUP-INV-8891',
    title: 'Ready-Mix Concrete Batch Supply 450m3 (C40/50)',
    description: 'Delivery batches for foundation pour from 01-Sep to 03-Sep with delivery dockets.',
    status: 'Approved',
    internal_approval_status: 'Approved',
    internal_reviewer: 'Procurement & AP Team',
    submitted_by: 'Kareem Nader (Apex ReadyMix)',
    submitted_at: '2026-09-03T11:00:00Z',
    created_at: '2026-09-03T10:30:00Z',
    updated_at: '2026-09-04T15:20:00Z',
    attachments: [
      {
        id: 'att-004',
        file_name: 'Batch_Delivery_Tickets_GRN.pdf',
        file_size_bytes: 3820000,
        mime_type: 'application/pdf',
        sha256_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        version: 1,
        scan_status: 'Clean',
        scan_details: 'Passed security scanner.',
        uploaded_by: 'Kareem Nader',
        uploaded_at: '2026-09-03T10:55:00Z',
      },
    ],
    comments: [],
  },
];

export const ExternalPortalView: React.FC = () => {
  // Preset Demo External Portal Personas
  const DEMO_USERS: PortalUser[] = [
    {
      id: 'usr-sub-01',
      username: 'albawani_sub',
      display_name: 'Al-Bawani Subcontractor Team',
      email: 'pmo@albawani.demo',
      party_id: 'party-sub-01',
      party_type: 'Subcontractor',
      contract_ids: ['SC-FOUNDATION-01', 'SC-EARTHWORKS-02'],
      project_ids: ['PRJ-NEOM-NORTH'],
      role: 'Portal_Subcontractor',
      notifications_opt_in: true,
      status: 'Active',
      created_at: '2026-01-10T00:00:00Z',
    },
    {
      id: 'usr-supp-01',
      username: 'apex_concrete',
      display_name: 'Apex ReadyMix Supplies',
      email: 'dispatch@apexreadymix.demo',
      party_id: 'party-supp-01',
      party_type: 'Supplier',
      contract_ids: ['PO-CONCRETE-2026-11'],
      project_ids: ['PRJ-NEOM-NORTH'],
      role: 'Portal_Supplier',
      notifications_opt_in: true,
      status: 'Active',
      created_at: '2026-02-15T00:00:00Z',
    },
    {
      id: 'usr-client-01',
      username: 'mot_client',
      display_name: 'Ministry of Transport (Client Rep)',
      email: 'consultant@mot.gov.demo',
      party_id: 'party-client-01',
      party_type: 'Client',
      contract_ids: ['SC-FOUNDATION-01', 'SC-EARTHWORKS-02', 'PO-CONCRETE-2026-11'],
      project_ids: ['PRJ-NEOM-NORTH'],
      role: 'Portal_Client',
      notifications_opt_in: true,
      status: 'Active',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const [activeUserIndex, setActiveUserIndex] = useState<number>(0);
  const currentUser = DEMO_USERS[activeUserIndex];

  const currentSession: PortalSession = useMemo(() => ({
    token: `portal-tok-${currentUser.id}-session`,
    user: currentUser,
    expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  }), [currentUser]);

  const [submissions, setSubmissions] = useState<PortalSubmission[]>(INITIAL_SUBMISSIONS);
  const [selectedSubmission, setSelectedSubmission] = useState<PortalSubmission | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [notificationOptIn, setNotificationOptIn] = useState<boolean>(currentUser.notifications_opt_in ?? true);

  // New Submission Form State
  const [newType, setNewType] = useState<PortalSubmissionType>('WIR');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContractId, setNewContractId] = useState<string>(currentUser.contract_ids[0] || '');
  const [newDescription, setNewDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // File Upload State
  const [stagedFiles, setStagedFiles] = useState<Array<{
    file: File;
    status: 'Clean' | 'Quarantined';
    details: string;
    hash: string;
  }>>([]);

  // Comment input state
  const [commentInput, setCommentInput] = useState<string>('');

  // Scoped submissions for currently active portal user
  const scopedSubmissions = useMemo(() => {
    return filterSubmissionsForSession(submissions, currentSession);
  }, [submissions, currentSession]);

  // Filtered by UI search & type
  const displayedSubmissions = useMemo(() => {
    return scopedSubmissions.filter((sub) => {
      if (typeFilter !== 'ALL' && sub.submission_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sub.reference_number.toLowerCase().includes(q) ||
          sub.title.toLowerCase().includes(q) ||
          sub.contract_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedSubmissions, typeFilter, statusFilter, searchQuery]);

  // Handle file selection and live security/quarantine scan
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const scanned: Array<{
      file: File;
      status: 'Clean' | 'Quarantined';
      details: string;
      hash: string;
    }> = [];

    for (const f of files) {
      try {
        const text = await f.text();
        const res = validateAndScanAttachment({
          name: f.name,
          size: f.size,
          mimeType: f.type,
          content: text,
        });
        scanned.push({
          file: f,
          status: res.scanStatus,
          details: res.scanDetails,
          hash: res.sha256Hash,
        });
      } catch (err: any) {
        setFormError(err.message || 'Attachment validation failed.');
        return;
      }
    }

    setStagedFiles((prev) => [...prev, ...scanned]);
  };

  // Submit new external submission
  const handleCreateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Rate Limit check
    const rate = checkRateLimit(`portal-sub-${currentUser.id}`, 20, 60000);
    if (!rate.allowed) {
      setFormError('Rate limit reached: Maximum 20 submissions per minute. Please wait.');
      return;
    }

    // 2. Validate role capability
    try {
      validateSubmissionTypeForRole(currentUser.role, newType);
    } catch (err: any) {
      setFormError(err.message);
      return;
    }

    // 3. Validate scope access
    try {
      validateScopeAccess(currentSession, {
        party_id: currentUser.party_id,
        contract_id: newContractId,
        project_id: currentUser.project_ids[0],
      });
    } catch (err: any) {
      setFormError(err.message);
      return;
    }

    // 4. Check for quarantined files
    const hasQuarantine = stagedFiles.some((f) => f.status === 'Quarantined');
    if (hasQuarantine) {
      setFormError('Cannot submit: One or more attachments have been quarantined by security scanner.');
      return;
    }

    if (!newTitle.trim()) {
      setFormError('Submission title is required.');
      return;
    }

    const newSubId = `sub-${Date.now()}`;
    const refNum = `${newType}-${currentUser.party_type.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const attachments: PortalAttachment[] = stagedFiles.map((sf, idx) => ({
      id: `att-${newSubId}-${idx}`,
      submission_id: newSubId,
      file_name: sf.file.name,
      file_size_bytes: sf.file.size,
      mime_type: sf.file.type || 'application/octet-stream',
      sha256_hash: sf.hash,
      version: 1,
      scan_status: sf.status,
      scan_details: sf.details,
      uploaded_by: currentUser.display_name,
      uploaded_at: new Date().toISOString(),
    }));

    const newSubmissionRecord: PortalSubmission = {
      id: newSubId,
      tenant_id: 'tenant-sa-01',
      party_id: currentUser.party_id,
      contract_id: newContractId,
      project_id: currentUser.project_ids[0] || 'PRJ-NEOM-NORTH',
      submission_type: newType,
      reference_number: refNum,
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'Submitted',
      internal_approval_status: 'Pending',
      attachments,
      comments: [],
      submitted_by: currentUser.display_name,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. G1 Outbox sync item creation (does not write directly to desktop SQLite)
    const syncItem = buildG1PortalSyncItem(newSubmissionRecord, 'create');
    setSyncStatusMsg(`Submission enqueued to G1 Sync Outbox (${syncItem.id}). Direct SQLite write bypassed.`);

    setSubmissions((prev) => [newSubmissionRecord, ...prev]);
    setIsNewModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setStagedFiles([]);
    setSelectedSubmission(newSubmissionRecord);

    setTimeout(() => {
      setSyncStatusMsg(null);
    }, 6000);
  };

  // External user adds comment to submission
  const handleAddComment = () => {
    if (!selectedSubmission || !commentInput.trim()) return;

    const newComment: PortalComment = {
      id: `comm-${Date.now()}`,
      submission_id: selectedSubmission.id,
      author_id: currentUser.id,
      author_name: currentUser.display_name,
      author_type: 'External',
      content: commentInput.trim(),
      created_at: new Date().toISOString(),
    };

    const updated = {
      ...selectedSubmission,
      comments: [...(selectedSubmission.comments || []), newComment],
      updated_at: new Date().toISOString(),
    };

    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSubmission(updated);
    setCommentInput('');
  };

  // External user re-submits if Clarification was Requested
  const handleResubmit = () => {
    if (!selectedSubmission) return;

    try {
      validateWorkflowTransition(selectedSubmission.status, 'Submitted', {
        type: 'External',
        userId: currentUser.id,
      });
    } catch (err: any) {
      alert(err.message);
      return;
    }

    const updated: PortalSubmission = {
      ...selectedSubmission,
      status: 'Submitted',
      internal_approval_status: 'Pending',
      updated_at: new Date().toISOString(),
    };

    const syncItem = buildG1PortalSyncItem(updated, 'update');
    setSyncStatusMsg(`Resubmission recorded via G1 Outbox (${syncItem.id}).`);

    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSubmission(updated);

    setTimeout(() => {
      setSyncStatusMsg(null);
    }, 6000);
  };

  return (
    <div id="external-portal-container" className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      {/* Header bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> G3 Scoped External Portal
            </span>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> G1 Sync Protocol Enabled
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">
            Client & Subcontractor Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Scoped access isolation: strictly limited by Party and Assigned Contracts. No direct desktop SQLite writes.
          </p>
        </div>

        {/* Persona Switcher for Preview & Verification */}
        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl flex flex-col gap-2">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>External Persona Simulation:</span>
            <span className="text-emerald-400 font-mono text-[11px]">Strict Scope Active</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_USERS.map((usr, idx) => (
              <button
                key={usr.id}
                id={`portal-persona-btn-${usr.id}`}
                onClick={() => {
                  setActiveUserIndex(idx);
                  setSelectedSubmission(null);
                  setNewContractId(usr.contract_ids[0] || '');
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeUserIndex === idx
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {usr.party_type}: {usr.display_name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncStatusMsg && (
        <div className="max-w-7xl mx-auto mt-4 p-3 bg-blue-950/70 border border-blue-600/50 rounded-lg text-blue-200 text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Active Scope Card */}
      <div className="max-w-7xl mx-auto mt-6 bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">{currentUser.display_name}</h2>
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">
                {currentUser.role}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
              <span>Party ID: <strong className="text-slate-300">{currentUser.party_id}</strong></span>
              <span>•</span>
              <span>Authorized Contracts: <strong className="text-emerald-400">{currentUser.contract_ids.join(', ')}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <Bell className={`w-3.5 h-3.5 ${notificationOptIn ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Email & In-App Alerts</span>
            <input
              type="checkbox"
              checked={notificationOptIn}
              onChange={(e) => setNotificationOptIn(e.target.checked)}
              className="ml-1 rounded border-slate-700"
            />
          </label>

          <button
            id="portal-new-submission-btn"
            onClick={() => setIsNewModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" /> New Submission
          </button>
        </div>
      </div>

      {/* Main Content: Filter + Submissions List */}
      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Submissions Table / Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="WIR">WIR</option>
                <option value="Invoice">Invoice</option>
                <option value="Submittal">Submittal</option>
                <option value="Document">Document</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Requires Clarification">Requires Clarification</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {displayedSubmissions.length === 0 ? (
            <div className="bg-slate-800/30 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">No submissions found in your authorized scope.</p>
              <p className="text-xs text-slate-500 mt-1">
                Submissions outside Party <code className="text-slate-400">{currentUser.party_id}</code> are isolated by security policy.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedSubmissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    id={`portal-sub-card-${sub.id}`}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/80 shadow-md'
                        : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {sub.reference_number}
                          </span>
                          <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium">
                            {sub.submission_type}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Contract: <span className="text-slate-300 font-mono">{sub.contract_id}</span>
                          </span>
                        </div>
                        <h3 className="font-semibold text-white text-sm mt-1">{sub.title}</h3>
                        {sub.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{sub.description}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                            sub.status === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : sub.status === 'Requires Clarification'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : sub.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {sub.status}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          {sub.attachments?.length || 0} file(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          {sub.comments?.length || 0} comment(s)
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">Submitted by {sub.submitted_by}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Detail Pane */}
        <div className="space-y-4">
          {selectedSubmission ? (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-4 sticky top-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-700">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedSubmission.reference_number}
                  </span>
                  <h3 className="font-bold text-white text-base mt-0.5">{selectedSubmission.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segregation of Duties Banner */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Segregation of Duties Enforced</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    External users cannot approve or reject submissions. Approval authority is reserved for Internal Project Controls.
                  </p>
                </div>
              </div>

              {/* Status details */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Workflow Status:</span>
                  <span className="font-semibold text-emerald-400">{selectedSubmission.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contract Scope:</span>
                  <span className="font-mono text-slate-200">{selectedSubmission.contract_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Internal Reviewer:</span>
                  <span className="text-slate-200">{selectedSubmission.internal_reviewer || 'Under Allocation'}</span>
                </div>
                {selectedSubmission.internal_comments && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-amber-300">
                    <strong>Internal Reviewer Note:</strong> {selectedSubmission.internal_comments}
                  </div>
                )}
              </div>

              {/* Attachments & Scan Status */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Attachments ({selectedSubmission.attachments?.length || 0})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Max 25MB • SHA-256</span>
                </h4>

                <div className="space-y-2">
                  {(selectedSubmission.attachments || []).map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-slate-200 font-medium truncate">{att.file_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {(att.file_size_bytes / 1024).toFixed(1)} KB • {att.sha256_hash.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {att.scan_status === 'Clean' ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                            <Shield className="w-3 h-3" /> Clean
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 text-[10px] bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" /> Quarantined
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Thread */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Conversation & Clarifications
                </h4>

                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  {(!selectedSubmission.comments || selectedSubmission.comments.length === 0) ? (
                    <p className="text-xs text-slate-500 text-center py-2">No comments recorded.</p>
                  ) : (
                    selectedSubmission.comments.map((comm) => (
                      <div
                        key={comm.id}
                        className={`p-2.5 rounded-lg text-xs ${
                          comm.author_type === 'External'
                            ? 'bg-slate-800/80 border border-slate-700 ml-4'
                            : 'bg-emerald-950/40 border border-emerald-800/40 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-200">{comm.author_name}</span>
                          <span>{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-300">{comm.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Write a response or clarification..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddComment}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg text-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedSubmission.status === 'Requires Clarification' && (
                <button
                  onClick={handleResubmit}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Submit Revised Response
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <Eye className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">No submission selected</p>
              <p className="text-xs text-slate-500 mt-1">
                Select any submission from the left list to review file attachments, virus scan results, and comments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Submission Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-lg">Create New Portal Submission</h3>
              </div>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setFormError(null);
                  setStagedFiles([]);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-700/80 rounded-lg text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmission} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Submission Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as PortalSubmissionType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {currentUser.role !== 'Portal_Supplier' && (
                      <option value="WIR">WIR (Work Inspection Request)</option>
                    )}
                    {currentUser.role !== 'Portal_Client' && (
                      <option value="Invoice">Invoice / Progress Claim</option>
                    )}
                    {currentUser.role !== 'Portal_Supplier' && (
                      <option value="Submittal">Technical Submittal</option>
                    )}
                    <option value="Document">Document / Contract Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Authorized Contract
                  </label>
                  <select
                    value={newContractId}
                    onChange={(e) => setNewContractId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {currentUser.contract_ids.map((cid) => (
                      <option key={cid} value={cid}>
                        {cid}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft Concrete Pour Zone B Inspection"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide technical references, BOQ items, or milestone details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Attachment Drag & Drop / Upload */}
              <div className="border border-dashed border-slate-700 rounded-xl p-4 text-center bg-slate-800/40">
                <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-xs text-slate-300 font-medium">
                  Upload attachments (PDF, Excel, Word, Images, ZIP)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Max 25MB per file • Prohibits scripts & executables • Live security scan
                </p>

                <input
                  type="file"
                  multiple
                  id="portal-file-input"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="portal-file-input"
                  className="inline-block mt-3 px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Select Files
                </label>
              </div>

              {/* Staged files with live virus scanning results */}
              {stagedFiles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">Staged Files:</span>
                  {stagedFiles.map((sf, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                        sf.status === 'Clean'
                          ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                          : 'bg-rose-950/60 border-rose-700 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sf.file.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(sf.file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {sf.status === 'Clean' ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px] bg-emerald-950 px-2 py-0.5 rounded">
                            <Shield className="w-3 h-3" /> Clean
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 text-[10px] bg-rose-950 px-2 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" /> Quarantined
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-rose-400 ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setFormError(null);
                    setStagedFiles([]);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow"
                >
                  Submit for Internal Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
