import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [
      p, t, c, ce, pr, s, pg, sc, ct, bh, bq, cf, si, ci, va, dc, wr, ld, eq, tr,
    ] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('costs').select('*').order('created_at', { ascending: false }),
      supabase.from('cost_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('procurement').select('*').order('created_at', { ascending: false }),
      supabase.from('safety').select('*').order('created_at', { ascending: false }),
      supabase.from('progress_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('schedules').select('*').order('created_at', { ascending: false }),
      supabase.from('contracts').select('*').order('created_at', { ascending: false }),
      supabase.from('boq_headers').select('*').order('created_at', { ascending: false }),
      supabase.from('boq_items').select('*').order('created_at', { ascending: false }),
      supabase.from('cash_flow').select('*').order('created_at', { ascending: false }),
      supabase.from('subcontractor_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('client_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('variations').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('wir_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('labor_duty').select('*').order('created_at', { ascending: false }),
      supabase.from('equipment').select('*').order('created_at', { ascending: false }),
      supabase.from('tracking_sheet').select('*').order('created_at', { ascending: false }),
    ]);

    setProjects(p.data || []);
    setTasks(t.data || []);
    setCosts(c.data || []);
    setCostEntries(ce.data || []);
    setProcurement(pr.data || []);
    setSafety(s.data || []);
    setProgress(pg.data || []);
    setSchedules(sc.data || []);
    setContracts(ct.data || []);
    setBoqHeaders(bh.data || []);
    setBoqItems(bq.data || []);
    setCashFlow(cf.data || []);
    setSubInvoices(si.data || []);
    setClientInvoices(ci.data || []);
    setVariations(va.data || []);
    setDocuments(dc.data || []);
    setWirEntries(wr.data || []);
    setLaborDuty(ld.data || []);
    setEquipment(eq.data || []);
    setTracking(tr.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  return {
    projects, tasks, costs, costEntries, procurement, safety, progress, schedules,
    contracts, boqHeaders, boqItems, cashFlow, subInvoices, clientInvoices, variations,
    documents, wirEntries, laborDuty, equipment, tracking, loading, reload: loadAll,
  };
}
