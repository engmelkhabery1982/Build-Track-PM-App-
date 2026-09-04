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
  Filter
} from 'lucide-react';
import { XerReconciliationBoard } from './XerReconciliationBoard';

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
    tagline: 'Streamlined field operations: Work Inspection Requests (WIR), daily logs, concrete pours, and subcontractor shifts.'
  },
  {
    id: 'project_manager',
    titleEn: 'Project Manager',
    titleAr: 'مدير المشروع',
    badge: 'Executive Cockpit',
    icon: Briefcase,
    tagline: 'High-level decision cockpit: EVM velocity, critical milestone health, risk radar, and pending executive sign-offs.'
  },
  {
    id: 'planning_engineer',
    titleEn: 'Planning & CPM',
    titleAr: 'مهندس التخطيط والجدولة',
    badge: 'Schedule & P6',
    icon: Calendar,
    tagline: 'Critical Path Method (CPM), Primavera P6 XER reconciliation, logic relationships, and EOT claim forensics.'
  },
  {
    id: 'commercial_manager',
    titleEn: 'Commercial & Contracts',
    titleAr: 'المهندس التجاري والعقود',
    badge: 'Cash & Retention',
    icon: FileSpreadsheet,
    tagline: 'Subcontractor Back-to-Back governance, IPC payment certificates, retention reserve, and variation order claims.'
  }
];

export const RoleBasedWorkspace: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>('site_engineer');
  const [zeroClutterMode, setZeroClutterMode] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [wirs, setWirs] = useState([
    { id: 'WIR-2026-084', title: 'Basement 2 Raft Rebar & Sleeves', location: 'Zone B', status: 'Consultant_Pending', time: '10:30 AM' },
    { id: 'WIR-2026-083', title: 'Retaining Wall Waterstop Joint Inspection', location: 'Axis 4-8', status: 'Approved', time: '08:45 AM' },
    { id: 'WIR-2026-082', title: 'Underground Chilled Water Pressure Test', location: 'Plant Room', status: 'Re_Inspection', time: 'Yesterday' }
  ]);

  const [dailyLogSubmitted, setDailyLogSubmitted] = useState<boolean>(false);

  const [approvals, setApprovals] = useState([
    { id: 'APPR-101', title: 'Consultant Interim Payment Certificate (IPC #05)', amount: '$420,000', impact: 'Cash Inflow', status: 'Pending' },
    { id: 'APPR-102', title: 'PVO-03: Structural Foundation Deepening Variation', amount: '$85,000', impact: '12 Days EOT', status: 'Pending' },
    { id: 'APPR-103', title: 'Subcontractor Retention Release - Earthworks Package', amount: '$4,750', impact: 'Payment Release', status: 'Pending' }
  ]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Approved' } : a));
    showNotification(`Item ${id} approved successfully!`);
  };

  const handleQuickWirSubmit = () => {
    const newId = `WIR-2026-08${wirs.length + 5}`;
    setWirs([{ id: newId, title: 'Ground Floor Columns Shuttering & Plumb', location: 'Zone A', status: 'Consultant_Pending', time: 'Just now' }, ...wirs]);
    showNotification(`New WIR (${newId}) logged and submitted to Consultant.`);
  };

  const currentRoleConfig = ROLES.find((r) => r.id === activeRole) || ROLES[0];

  return (
    <div className="space-y-6" id="role-based-workspace-container">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-neutral-700 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
              UX-01
            </span>
            <span className="text-xs font-bold text-neutral-800">
              Zero-Clutter Role Workspaces
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

        <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
          <p className="text-[11px] text-neutral-500">
            <strong>Active View:</strong> {currentRoleConfig.tagline}
          </p>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-neutral-200 rounded text-neutral-700">
            {currentRoleConfig.badge}
          </span>
        </div>
      </div>

      {activeRole === 'site_engineer' && (
        <div className="space-y-5" id="site-engineer-workspace">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Today's WIRs</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {wirs.filter((w) => w.status === 'Consultant_Pending').length} Pending
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">3 Total scheduled today</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Site Manpower</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">142 Workers</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">+8 above planned shift</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Concrete Booked</span>
                <Truck className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">280 m³</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Raft pour starts 14:00</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Daily Log Status</span>
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {dailyLogSubmitted ? 'Submitted' : 'Draft Ready'}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Weather: Clear 31°C</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    Work Inspection Requests (WIR) — طلبات فحص واستلام الأعمال
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Direct handoff with Consultant Resident Engineer
                  </p>
                </div>
                <button
                  onClick={handleQuickWirSubmit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New WIR
                </button>
              </div>

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                {wirs.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900">{item.id}</span>
                        <span className="text-xs font-semibold text-neutral-800">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Location: <strong>{item.location}</strong> • Time: {item.time}
                      </div>
                    </div>
                    <div>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900">
                  Daily Diary (يوميات الموقع)
                </h4>
                <span className="text-xs font-mono text-neutral-500">2026-05-01</span>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-700">
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Shift Supervision:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">Eng. Ahmed & Eng. Kareem (Main Site + Zone C)</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Critical Ongoing Activities:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">Rebar fixing Zone B, Shoring dewatering pumps checked (Running normal).</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="font-semibold text-neutral-800">Safety & H&S:</div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">Zero incidents. Morning tool-box talk conducted for 38 steel fixers.</div>
                </div>
              </div>

              <button
                disabled={dailyLogSubmitted}
                onClick={() => {
                  setDailyLogSubmitted(true);
                  showNotification('Daily Site Log signed and transmitted to PM & PMO.');
                }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  dailyLogSubmitted
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{dailyLogSubmitted ? 'Daily Log Transmitted' : 'Submit & Sign Daily Log'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeRole === 'project_manager' && (
        <div className="space-y-5" id="project-manager-workspace">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Schedule Velocity (SPI)</span>
              <div className="text-xl font-bold text-neutral-900 mt-1 flex items-center gap-2">
                <span>0.96</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">-4% Drift</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Critical path recovered 2 days</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Cost Efficiency (CPI)</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
                <span>1.03</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Under Budget</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">+$45k positive cost variance</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Milestone Countdown</span>
              <div className="text-xl font-bold text-neutral-900 mt-1">18 Days</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Basement Raft Concrete Handover</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Pending Actions</span>
              <div className="text-xl font-bold text-neutral-900 mt-1">
                {approvals.filter((a) => a.status === 'Pending').length} Decisions
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Urgent sign-offs needed</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Pending Project Manager Sign-offs & Approvals (موافقات مدير المشروع)
                </h4>
                <p className="text-xs text-neutral-500">
                  Critical contractual & commercial approvals protecting cash flow and project progress
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {approvals.map((appr) => (
                <div key={appr.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-900">{appr.id}</span>
                      <span className="text-xs font-semibold text-neutral-800">{appr.title}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Value: <strong className="text-neutral-900">{appr.amount}</strong> • Impact: {appr.impact}
                    </div>
                  </div>

                  <div>
                    {appr.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(appr.id)}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeRole === 'planning_engineer' && (
        <div className="space-y-5" id="planning-engineer-workspace">
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Planning & Schedule Control (SCH-06 Integrated):</strong> True round-trip bidirectional synchronization with Primavera P6, CPM logic audits, and forensic delay analyses.
          </div>
          <XerReconciliationBoard />
        </div>
      )}

      {activeRole === 'commercial_manager' && (
        <div className="space-y-5" id="commercial-manager-workspace">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Total Subcontractor Gross</span>
              <div className="text-lg font-bold text-neutral-900 mt-1">$910,000</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">5 active trade packages</div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-medium text-neutral-500">Cumulative Retention Held</span>
              <div className="text-lg font-bold text-neutral-900 mt-1">$86,250</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Guarantee reserve safe</div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-medium text-amber-800">Protected Liquidity (PWP)</span>
              <div className="text-lg font-bold text-amber-900 mt-1">$571,500</div>
              <div className="text-[10px] text-amber-700 mt-0.5">Held pending client IPC</div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-800">Safe to Release</span>
              <div className="text-lg font-bold text-emerald-900 mt-1">$162,000</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Client payment collected</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-neutral-900">
              Commercial Governance & Back-to-Back Policy Rule
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Under clause 14.7 and Back-to-Back Subcontract Conditions, payments to trade contractors are only certified for disbursement once the corresponding main Employer Interim Payment Certificate (IPC) has cleared through the project escrow account, with standard retention deductions enforced.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleBasedWorkspace;