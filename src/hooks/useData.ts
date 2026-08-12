import { useState, useEffect, useCallback } from 'react';
import { dataRepository } from '@/data';
import type {
  Project, Task, Cost, CostEntry, Procurement, Safety, ProgressEntry,
  Schedule, Contract, BOQHeader, BOQItem, CashFlowEntry, SubcontractorInvoice,
  ClientInvoice, Variation, DocumentEntry, WIREntry, LaborDuty, Equipment, TrackingSheet,
} from '@/types';

export type LocalDataMutation =
  | { type: 'insert'; row: Record<string, any> }
  | { type: 'insertMany'; rows: Record<string, any>[] }
  | { type: 'update'; row: Record<string, any> }
  | { type: 'delete'; id: string };

export function useData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [procurement, setProcurement] = useState<Procurement[]>([]);
  const [safety, setSafety] = useState<Safety[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [boqHeaders, setBoqHeaders] = useState<BOQHeader[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [subInvoices, setSubInvoices] = useState<SubcontractorInvoice[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [wirEntries, setWirEntries] = useState<WIREntry[]>([]);
  const [laborDuty, setLaborDuty] = useState<LaborDuty[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [tracking, setTracking] = useState<TrackingSheet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const [
        p, t, c, ce, pr, s, pg, sc, ct, bh, bq, cf, si, ci, va, dc, wr, ld, eq, tr,
      ] = await Promise.all([
        dataRepository.list<Project>('projects'),
        dataRepository.list<Task>('tasks'),
        dataRepository.list<Cost>('costs'),
        dataRepository.list<CostEntry>('cost_entries'),
        dataRepository.list<Procurement>('procurement'),
        dataRepository.list<Safety>('safety'),
        dataRepository.list<ProgressEntry>('progress_entries'),
        dataRepository.list<Schedule>('schedules'),
        dataRepository.list<Contract>('contracts'),
        dataRepository.list<BOQHeader>('boq_headers'),
        dataRepository.list<BOQItem>('boq_items'),
        dataRepository.list<CashFlowEntry>('cash_flow'),
        dataRepository.list<SubcontractorInvoice>('subcontractor_invoices'),
        dataRepository.list<ClientInvoice>('client_invoices'),
        dataRepository.list<Variation>('variations'),
        dataRepository.list<DocumentEntry>('documents'),
        dataRepository.list<WIREntry>('wir_entries'),
        dataRepository.list<LaborDuty>('labor_duty'),
        dataRepository.list<Equipment>('equipment'),
        dataRepository.list<TrackingSheet>('tracking_sheet'),
      ]);

      setProjects(p);
      setTasks(t);
      setCosts(c);
      setCostEntries(ce);
      setProcurement(pr);
      setSafety(s);
      setProgress(pg);
      setSchedules(sc);
      setContracts(ct);
      setBoqHeaders(bh);
      setBoqItems(bq);
      setCashFlow(cf);
      setSubInvoices(si);
      setClientInvoices(ci);
      setVariations(va);
      setDocuments(dc);
      setWirEntries(wr);
      setLaborDuty(ld);
      setEquipment(eq);
      setTracking(tr);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(true);
  }, [loadAll]);

  const applyLocalMutation = useCallback((tableName: string, mutation: LocalDataMutation) => {
    const apply = (setRows: any) => {
      setRows((previous: Record<string, any>[]) => {
        switch (mutation.type) {
          case 'insert':
            return [mutation.row, ...previous];
          case 'insertMany':
            return [...mutation.rows, ...previous];
          case 'update':
            return previous.map((row: Record<string, any>) => row.id === mutation.row.id ? mutation.row : row);
          case 'delete':
            return previous.filter((row: Record<string, any>) => row.id !== mutation.id);
        }
      });
    };

    switch (tableName) {
      case 'projects': apply(setProjects); break;
      case 'tasks': apply(setTasks); break;
      case 'costs': apply(setCosts); break;
      case 'cost_entries': apply(setCostEntries); break;
      case 'procurement': apply(setProcurement); break;
      case 'safety': apply(setSafety); break;
      case 'progress_entries': apply(setProgress); break;
      case 'schedules': apply(setSchedules); break;
      case 'contracts': apply(setContracts); break;
      case 'boq_headers': apply(setBoqHeaders); break;
      case 'boq_items': apply(setBoqItems); break;
      case 'cash_flow': apply(setCashFlow); break;
      case 'subcontractor_invoices': apply(setSubInvoices); break;
      case 'client_invoices': apply(setClientInvoices); break;
      case 'variations': apply(setVariations); break;
      case 'documents': apply(setDocuments); break;
      case 'wir_entries': apply(setWirEntries); break;
      case 'labor_duty': apply(setLaborDuty); break;
      case 'equipment': apply(setEquipment); break;
      case 'tracking_sheet': apply(setTracking); break;
    }
  }, []);

  return {
    projects, tasks, costs, costEntries, procurement, safety, progress, schedules,
    contracts, boqHeaders, boqItems, cashFlow, subInvoices, clientInvoices, variations,
    documents, wirEntries, laborDuty, equipment, tracking, loading,
    reload: loadAll, applyLocalMutation,
  };
}
