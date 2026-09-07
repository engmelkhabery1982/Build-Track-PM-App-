import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { SyncOutboxEntry, SyncInboxEntry, SyncMetadata } from '../types';
import { RefreshCw, CheckCircle2, AlertTriangle, Download, XCircle, Database } from 'lucide-react';

export const SyncCenter: React.FC = () => {
  const { dataRepository } = useData();
  const [outbox, setOutbox] = useState<SyncOutboxEntry[]>([]);
  const [inbox, setInbox] = useState<SyncInboxEntry[]>([]);
  const [metadata, setMetadata] = useState<SyncMetadata | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSyncData = async () => {
    try {
      const ob = await dataRepository.list<SyncOutboxEntry>('sync_outbox');
      setOutbox(ob.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      const ib = await dataRepository.list<SyncInboxEntry>('sync_inbox');
      setInbox(ib.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      const meta = await dataRepository.list<SyncMetadata>('sync_metadata');
      if (meta.length > 0) setMetadata(meta[0]);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // Fake sync delay
      await new Promise(r => setTimeout(r, 1500));
      
      // Mark outbox as synced
      for (const entry of outbox.filter(e => e.status === 'Pending' || e.status === 'Failed')) {
        await dataRepository.update('sync_outbox', entry.id, {
          status: 'Synced',
          synced_at: new Date().toISOString()
        });
      }

      // Record metadata
      const metaId = metadata?.id || crypto.randomUUID();
      const metaPayload = { id: metaId, last_synced_at: new Date().toISOString(), status: 'Success' };
      if (metadata) {
        await dataRepository.update('sync_metadata', metaId, metaPayload);
      } else {
        await dataRepository.insert('sync_metadata', metaPayload);
      }

      await loadSyncData();
    } catch (e: any) {
      setError(e.message);
      if (metadata) {
         await dataRepository.update('sync_metadata', metadata.id, { status: 'Failed', last_error: e.message });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportDiagnostics = () => {
    // Export outbox without secrets
    const safeData = outbox.map(entry => {
       const parsed = JSON.parse(entry.payload_json);
       // basic redaction
       Object.keys(parsed).forEach(k => {
          if (k.match(/password|token|secret/i)) parsed[k] = '[REDACTED]';
       });
       return { ...entry, payload_json: JSON.stringify(parsed) };
    });
    const blob = new Blob([JSON.stringify(safeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync_diagnostics_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Hybrid Sync Center
          </h1>
          <p className="text-gray-500">Manage offline data synchronization</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportDiagnostics}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Diagnostics
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 \${isSyncing ? 'animate-spin' : ''}`} /> 
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {metadata && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-2 bg-gray-100 rounded-full">
            {metadata.status === 'Success' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Last Sync: {metadata.status}</h3>
            <p className="text-sm text-gray-500">{metadata.last_synced_at ? new Date(metadata.last_synced_at).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Outbox Queue ({outbox.length})</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {outbox.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending changes.</div>
          ) : (
            outbox.map(entry => (
              <div key={entry.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded \${entry.action === 'Delete' ? 'bg-red-100 text-red-800' : entry.action === 'Update' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {entry.action}
                      </span>
                      <span className="font-medium text-gray-900">{entry.entity_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{entry.entity_id}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium \${entry.status === 'Synced' ? 'text-green-600' : entry.status === 'Failed' ? 'text-red-600' : 'text-amber-600'}`}>
                      {entry.status}
                    </span>
                    {entry.last_error && <p className="text-xs text-red-500 max-w-xs mt-1 truncate" title={entry.last_error}>{entry.last_error}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
