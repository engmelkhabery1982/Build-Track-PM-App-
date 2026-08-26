export interface SupplierApOperationResult { operationId: string; status: 'Posted'; }

async function invokeAp<T>(command: string, request: Record<string, unknown>): Promise<T> {
  if (!('__TAURI_INTERNALS__' in window)) throw new Error('Governed supplier AP operations are available only in the BuildTrack desktop application.');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, { request });
}

export const approveSupplierInvoice = (request: { operationId: string; invoiceId: string; actor: string; approvedAt: string }) => invokeAp<SupplierApOperationResult>('approve_supplier_invoice', request);
export const settleSupplierInvoicePayment = (request: { operationId: string; paymentId: string; actor: string; settledAt: string }) => invokeAp<SupplierApOperationResult>('settle_supplier_invoice_payment', request);
export const reverseSupplierApPosting = (request: { operationId: string; sourceTable: 'supplier_invoices' | 'supplier_invoice_payments'; sourceId: string; actor: string; reason: string }) => invokeAp<SupplierApOperationResult>('reverse_supplier_ap_posting', request);
