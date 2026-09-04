import React, { useState } from 'react';
import {
  HardHat,
  Briefcase,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  FileCheck,
  Plus,
  Users,
  Truck,
  Check,
  Filter,
  XCircle
} from 'lucide-react';
import { XerReconciliationBoard } from './XerReconciliationBoard';
import { useProjectContext } from '../context/ProjectContext';

export type UserRole = 'site_engineer' | 'project_manager' | 'planning_engineer' | 'commercial_manager';

export interface RoleConfig {
  id: UserRole;
  titleEn: string;
  titleAr: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
}

const ROLES: RoleConfig[] = [
  {
    id: 'site_engineer',
    titleEn: 'Site Engineer',
    titleAr: 'مهندس الموقع',
    badge: 'Operations Focus',
    icon: HardHat,
    tagline: 'Field execution directly tied to BOQ and Schedule: Work Inspection Requests (WIR), daily logs, concrete pours, and subcontractor shifts.'
  },
  {
    id: 'project_manager',
    titleEn: 'Project Manager',
    titleAr: 'مدير المشروع',
    badge: 'Executive Cockpit',
    icon: Briefcase,
    tagline: 'Live project KPIs: Dynamic EVM (SPI/CPI), critical milestone health, and contractual approvals desk.'
  },
  {
    id: 'planning_engineer',
    titleEn: 'Planning & CPM',
    titleAr: 'مهندس التخطيط والجدولة',
    badge: 'Schedule & P6',
    icon: Calendar,
    tagline: 'CPM schedule control: Bidirectional Primavera P6 XER reconciliation with Central Project BOQ.'
  },
  {
    id: 'commercial_manager',
    titleEn: 'Commercial & Contracts',
    titleAr: 'المهندس التجاري والعقود',
    badge: 'Cash & Retention',
    icon: FileSpreadsheet,
    tagline: 'Subcontractor Back-to-Back governance, IPC payment certificates, retention reserve, and variation orders.'
  }
];

export const RoleBasedWorkspace: React.FC = () => {
  const {
    state,
    submitWir,
    approveWir,
    rejectWir,
    submitDailyLog,
    approvePmAction,
    rejectPmAction,
    spi,
    cpi,
    totalExecutedContractValue,
    totalRetentionHeld,
    totalPendingIpc
  } = useProjectContext();

  const [activeRole, setActiveRole] = useState<UserRole>('site_engineer');
  const [zeroClutterMode, setZeroClutterMode] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New WIR modal/input state
  const [showNewWirModal, setShowNewWirModal] = useState<boolean>(false);
  const [newWirTitle, setNewWirTitle] = useState('');
  const [newWirActivityId, setNewWirActivityId] = useState(state.activities[0]?.activityId || '');
  const [newWirLocation, setNewWirLocation] = useState('Ground Floor Zone A');
  const [newWirQty, setNewWirQty] = useState(150);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCreateWirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedAct = state.activities.find((a) => a.activityId === newWirActivityId);
    submitWir({
      title: newWirTitle || 'Ground Floor Columns Shuttering & Plumb',
      activityId: newWirActivityId,
      boqItemId: linkedAct?.boqItemId || 'BOQ-01',
      packageId: linkedAct?.packageId || 'PKG-CIVIL',
      location: newWirLocation,
      inspectionDate: state.dataDate,
      quantityInspected: Number(newWirQty) || 50,
      submittedBy: 'Eng. Site Team'
    });
    setShowNewWirModal(false);
    showNotification('WIR submitted directly into Central Project Database!');
  };

  const currentRoleConfig = ROLES.find((r) => r.id === activeRole) || ROLES[0];
  const activeDailyLog = state.dailyLogs[0];

  return (
    <div className="space-y-6" id="role-based-workspace-container">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-neutral-700 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Role Switcher Navigation Bar */}
      <div className="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
              UX-01 Live Data
            </span>
            <span className="text-xs font-bold text-neutral-800">
              {state.projectName} ({state.projectCode})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZeroClutterMode(!zeroClutterMode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                zeroClutterMode
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-neutral-600 border-neutral-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Zero-Clutter Focus Mode: {zeroClutterMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Persona Tabs Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-white border-neutral-900 shadow-xs ring-1 ring-neutral-900/10'
                    : 'bg-white/60 border-neutral-200/80 hover:bg-white text-neutral-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {role.titleEn}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">{role.titleAr}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Active Persona Banner */}
        <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
          <p className="text-[11px] text-neutral-500">
            <strong>Active View:</strong> {currentRoleConfig.tagline}
          </p>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-neutral-200 rounded text-neutral-700">
            {currentRoleConfig.badge}
          </span>
        </div>
      </div>

      {/* 1. SITE ENGINEER WORKSPACE */}
      {activeRole === 'site_engineer' && (
        <div className="space-y-5" id="site-engineer-workspace">
          {/* Quick Action & Today's Vital Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Today's WIRs</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {state.wirs.filter((w) => w.status === 'Consultant_Pending').length} Pending
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">{state.wirs.length} Total registered WIRs</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Site Manpower</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {activeDailyLog ? `${activeDailyLog.manpowerTotal} Workers` : '142 Workers'}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">+8 above planned shift</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Concrete Booked</span>
                <Truck className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {activeDailyLog ? `${activeDailyLog.concreteVolumePouredM3} m³` : '280 m³'}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Raft pour starts 14:00</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Daily Log Status</span>
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {activeDailyLog?.submitted ? 'Submitted' : 'Draft Ready'}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Weather: {activeDailyLog?.weather || 'Clear'}</div>
            </div>
          </div>

          {/* Core Site Tasks - Zero Clutter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* WIR Submissions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    Work Inspection Requests (WIR) — طلبات فحص واستلام الأعمال
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Directly tied to BOQ quantities and Schedule Activities (Approving auto-advances progress!)
                  </p>
                </div>
                <button
                  onClick={() => setShowNewWirModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New WIR
                </button>
              </div>

              {/* Modal for adding WIR */}
              {showNewWirModal && (
                <form onSubmit={handleCreateWirSubmit} className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                  <div className="font-bold text-xs text-neutral-800">Submit New Inspection to Consultant</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Title / Work Scope</label>
                      <input
                        type="text"
                        required
                        value={newWirTitle}
                        onChange={(e) => setNewWirTitle(e.target.value)}
                        placeholder="e.g. Columns Shuttering & Plumb"
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Linked Activity</label>
                      <select
                        value={newWirActivityId}
                        onChange={(e) => setNewWirActivityId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                      >
                        {state.activities.map((act) => (
                          <option key={act.activityId} value={act.activityId}>
                            {act.activityId} - {act.taskName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Site Location</label>
                      <input
                        type="text"
                        value={newWirLocation}
                        onChange={(e) => setNewWirLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Quantity Inspected</label>
                      <input
                        type="number"
                        value={newWirQty}
                        onChange={(e) => setNewWirQty(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewWirModal(false)}
                      className="px-3 py-1 text-xs border border-neutral-300 rounded-lg text-neutral-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                    >
                      Save & Transmit
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                {state.wirs.map((item) => (
                  <div key={item.id} className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-neutral-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900">{item.id}</span>
                        <span className="text-xs font-semibold text-neutral-800">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Location: <strong>{item.location}</strong> • Activity: <span className="font-mono text-blue-700">{item.activityId}</span> • BOQ: <span className="font-mono text-neutral-700">{item.boqItemId}</span>
                      </div>
                      {item.consultantNotes && (
                        <div className="text-[10px] text-neutral-500 italic mt-0.5">Notes: {item.consultantNotes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold ${
                          item.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'Consultant_Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>

                      {item.status === 'Consultant_Pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              approveWir(item.id);
                              showNotification(`WIR ${item.id} Approved! Progress & BOQ updated.`);
                            }}
                            title="Consultant Approved"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              rejectWir(item.id, 'Discrepancy in rebar spacing');
                              showNotification(`WIR ${item.id} returned for re-inspection.`);
                            }}
                            title="Consultant Rejected / Re-Inspection"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-rose-200"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Site Log (اليوميات) Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900">
                  Daily Diary (يوميات الموقع)
                </h4>
                <span className="text-xs font-mono text-neutral-500">{activeDailyLog?.date || state.dataDate}</span>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-700">
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Shift Supervision:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">Eng. Ahmed & Eng. Kareem (Main Site + Zone C)</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Active Scheduled Activities:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {state.activities.filter((a) => a.progressPct > 0 && a.progressPct < 100).map((a) => a.activityId).join(', ') || 'ACT-1010, ACT-1020'}
                  </div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Safety & H&S:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">Zero incidents. Morning tool-box talk conducted for 38 steel fixers.</div>
                </div>
              </div>

              <button
                disabled={activeDailyLog?.submitted}
                onClick={() => {
                  submitDailyLog('Eng. Tamer');
                  showNotification('Daily Site Log signed and transmitted to PM & PMO.');
                }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeDailyLog?.submitted
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeDailyLog?.submitted ? `Transmitted (${activeDailyLog.signedByEngineer || 'Signed'})` : 'Submit & Sign Daily Log'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROJECT MANAGER WORKSPACE */}
      {activeRole === 'project_manager' && (
        <div className="space-y-5" id="project-manager-workspace">
          {/* Executive EVM KPIs calculated from CENTRAL DATA */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Schedule Velocity (SPI)</span>
              <div className="text-xl font-bold text-neutral-900 mt-1 flex items-center gap-2">
                <span>{spi}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${spi >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {spi >= 1.0 ? 'On Track' : `${Math.round((spi - 1) * 100)}% Drift`}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Live from Activity Progress</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Cost Efficiency (CPI)</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
                <span>{cpi}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  {cpi >= 1.0 ? 'Under Budget' : 'Over Budget'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Calculated from BOQ & Paid IPCs</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Executed BOQ Valuation</span>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                ${totalExecutedContractValue.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Approved WIR Certified Qty</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Pending PM Approvals</span>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {state.approvals.filter((a) => a.status === 'Pending').length} Decisions
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Requiring PM sign-off</div>
            </div>
          </div>

          {/* PM Decision & Approval Desk */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Pending Project Manager Sign-offs & Approvals (موافقات مدير المشروع)
                </h4>
                <p className="text-xs text-neutral-500">
                  Direct impact: Approving Employer IPC unlocks Subcontractor Back-to-Back payments and updates cash balances.
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {state.approvals.map((appr) => (
                <div key={appr.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-900">{appr.id}</span>
                      <span className="text-xs font-semibold text-neutral-800">{appr.title}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Package: <strong className="text-neutral-700">{appr.packageId}</strong> • Value: <strong className="text-neutral-900">${appr.amount.toLocaleString()}</strong> • Rationale: {appr.rationale}
                    </div>
                  </div>

                  <div>
                    {appr.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            approvePmAction(appr.id);
                            showNotification(`Approved ${appr.id}! Central contracts & financial ledger updated.`);
                          }}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Approve Action
                        </button>
                        <button
                          onClick={() => {
                            rejectPmAction(appr.id);
                            showNotification(`Action ${appr.id} rejected.`);
                          }}
                          className="px-3 py-1 border border-neutral-300 text-neutral-600 rounded-lg text-xs hover:bg-neutral-100"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-md border ${
                        appr.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {appr.status === 'Approved' ? <Check className="w-3.5 h-3.5" /> : null} {appr.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. PLANNING ENGINEER WORKSPACE */}
      {activeRole === 'planning_engineer' && (
        <div className="space-y-5" id="planning-engineer-workspace">
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <div>
              <strong>Planning & Schedule Control (SCH-06 Integrated with Central BOQ):</strong> True round-trip bidirectional synchronization with Primavera P6, CPM logic audits, and forensic delay analyses linked to project work breakdown structure.
            </div>
          </div>
          {/* Integrated Primavera P6 XER Reconciliation Board with live data bus */}
          <XerReconciliationBoard />
        </div>
      )}

      {/* 4. COMMERCIAL & CONTRACTS WORKSPACE */}
      {activeRole === 'commercial_manager' && (
        <div className="space-y-5" id="commercial-manager-workspace">
          {/* Financial KPIs computed from central state.contracts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Subcontracts Commitment</span>
              <div className="text-lg font-bold text-neutral-900 mt-1">
                ${state.contracts.reduce((sum, c) => sum + c.contractValue, 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{state.contracts.length} active trade packages</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Cumulative Retention Held</span>
              <div className="text-lg font-bold text-neutral-900 mt-1">
                ${totalRetentionHeld.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Guarantee reserve safe</div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-medium text-amber-800">Pending Trade IPCs</span>
              <div className="text-lg font-bold text-amber-900 mt-1">
                ${totalPendingIpc.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Awaiting certification</div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-800">Disbursed to Date</span>
              <div className="text-lg font-bold text-emerald-900 mt-1">
                ${state.contracts.reduce((sum, c) => sum + c.paidToDate, 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Cleared via escrow accounts</div>
            </div>
          </div>

          {/* Subcontractor Packages Governance Table */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-neutral-900">
              Subcontractor Back-to-Back (PWP) Compliance Ledger
            </h4>
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Package Code</th>
                    <th className="py-2.5 px-3 font-semibold">Package & Contractor</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Contract Value</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Paid to Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Retention (10%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Employer Cleared?</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {state.contracts.map((pkg) => (
                    <tr key={pkg.packageId} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{pkg.packageId}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900">{pkg.packageName}</div>
                        <div className="text-[11px] text-neutral-500">{pkg.subcontractor}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">${pkg.contractValue.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">${pkg.paidToDate.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-semibold">${pkg.retentionHeld.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pkg.clientIpcCleared
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {pkg.clientIpcCleared ? 'Yes (Cleared)' : 'No (Pending Client)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pkg.clientIpcCleared
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {pkg.clientIpcCleared ? 'Safe to Disburse' : 'PWP Protected (Hold)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleBasedWorkspace;
