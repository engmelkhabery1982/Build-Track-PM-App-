const qty = (value: number) => Math.round(value * 10000) / 10000;

/**
 * Single quantity truth by main BOQ item. Subcontract activities and WIRs
 * are mapped to their parent main BOQ item before aggregation, once only.
 */
export function buildQuantityLedger(input: {
  boqItems: Record<string, any>[];
  schedules: Record<string, any>[];
  wirEntries: Record<string, any>[];
  variations: Record<string, any>[];
  variationLines: Record<string, any>[];
}) {
  const itemById = new Map(input.boqItems.map((item) => [item.id, item]));
  const mainIdFor = (itemId: unknown) => {
    const item = itemById.get(String(itemId || ''));
    return item?.main_boq_item_id || item?.id || null;
  };
  const approvedVariationIds = new Set(input.variations.filter((row) => row.status === 'Approved').map((row) => row.id));
  return input.boqItems.filter((item) => !item.main_boq_item_id).map((item) => {
    const itemId = item.id;
    const variationQuantity = input.variationLines.filter((line) => approvedVariationIds.has(line.variation_id) && mainIdFor(line.boq_item_id) === itemId)
      .reduce((sum, line) => sum + (Number(line.quantity_change) || 0), 0);
    const planned = input.schedules.filter((row) => mainIdFor(row.boq_item_id) === itemId && String(row.activity || '').trim())
      .reduce((sum, row) => sum + (Number(row.planned_quantity) || 0), 0);
    const wirs = input.wirEntries.filter((row) => mainIdFor(row.boq_item_id) === itemId);
    const inspected = wirs.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const accepted = wirs.filter((row) => ['Pass', 'Conditional Pass'].includes(String(row.result || '')) || row.status === 'Approved')
      .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const original = Number(item.quantity) || 0;
    const revised = original + variationQuantity;
    return {
      id: `quantity-ledger:${itemId}`, project_id: item.project_id, contract_id: item.contract_id || null, boq_item_id: itemId,
      item_code: item.item_code, item_name: item.item_name || item.description || '', unit: item.unit || '',
      original_quantity: qty(original), approved_variation_quantity: qty(variationQuantity), revised_quantity: qty(revised),
      planned_quantity: qty(planned), inspected_quantity: qty(inspected), accepted_quantity: qty(accepted),
      remaining_quantity: qty(Math.max(0, revised - accepted)), over_measured_quantity: qty(Math.max(0, accepted - revised)),
      quantity_status: accepted > revised + 0.000001 ? 'Over Measured' : planned > revised + 0.000001 ? 'Over Planned' : 'Within Scope',
    };
  });
}
