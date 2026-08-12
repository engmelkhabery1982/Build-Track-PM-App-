import { useState, useEffect, useCallback } from 'react';
import { dataRepository } from '@/data';
import type {
  Project, Task, Cost, CostEntry, Procurement, Safety, ProgressEntry,
  Schedule, Contract, BOQHeader, BOQItem, CashFlowEntry, SubcontractorInvoice,
  ClientInvoice, Variation, DocumentEntry, WIREntry, LaborDuty, Equipment, TrackingSheet,
} from '@/types';

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

  return {
    projects, tasks, costs, costEntries, procurement, safety, progress, schedules,
    contracts, boqHeaders, boqItems, cashFlow, subInvoices, clientInvoices, variations,
    documents, wirEntries, laborDuty, equipment, tracking, loading, reload: loadAll,
  };
}
