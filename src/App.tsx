import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { RoleBasedWorkspace } from './components/RoleBasedWorkspace';
import { Calendar, Shield } from 'lucide-react';

export default function App() {
  return (
    <ProjectProvider>
      <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans p-4 md:p-8" id="buildtrack-app-root">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top App Header */}
          <header className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black text-sm">
                  BT
                </div>
                <h1 className="text-xl font-bold text-neutral-900">
                  BuildTrack Enterprise CPM & Workspaces
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Deeply Integrated Data Bus
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Connected Project Model: BOQ Items, Subcontracts, Primavera P6 CPM, Field WIRs & Commercial Retention
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-neutral-600">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Data Date: <strong>2026-05-01</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audit: <strong>Central Data Graph Active</strong></span>
              </div>
            </div>
          </header>

          {/* Unified Project Hub Container */}
          <main className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
            <RoleBasedWorkspace />
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
