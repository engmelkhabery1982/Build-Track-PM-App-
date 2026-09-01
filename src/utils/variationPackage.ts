const money = (value: number) => Math.round(value * 100) / 100;

/** Read-only pre-approval commercial impact. It deliberately mirrors the
 * governed posting basis: variation lines, never a manually typed header. */
export function previewVariationPackage(
  variation: Record<string, any>,
  lines: Record<string, any>[],
) {
  const packageLines = lines.filter((line) => line.variation_id === variation.id);
  const errors: string[] = [];
  for (const line of packageLines) {
    const type = String(line.change_type || '');
    if (!['New Item', 'Quantity Change', 'Rate Change', 'Quantity & Rate Change'].includes(type)) errors.push(`Line ${line.id}: invalid change type.`);
    if (type === 'New Item' && (!String(line.boq_header_id || '').trim() || !String(line.item_code || '').trim())) errors.push(`Line ${line.id}: new item requires BOQ header and item code.`);
    if (type !== 'New Item' && !String(line.boq_item_id || '').trim()) errors.push(`Line ${line.id}: existing item change requires a BOQ item.`);
  }
  if (!packageLines.length) errors.push('A variation requires at least one line.');
  const impact = money(packageLines.reduce((sum, line) => sum + (Number(line.value_impact) || 0), 0));
  const counts = Object.fromEntries(['New Item', 'Quantity Change', 'Rate Change', 'Quantity & Rate Change']
    .map((type) => [type, packageLines.filter((line) => line.change_type === type).length]));
  return {
    line_count: packageLines.length,
    preview_value_impact: impact,
    preview_time_impact_days: Number(variation.time_impact_days) || 0,
    new_item_count: counts['New Item'], quantity_change_count: counts['Quantity Change'], rate_change_count: counts['Rate Change'], combined_change_count: counts['Quantity & Rate Change'],
    posting_readiness: errors.length ? 'Needs Correction' : 'Ready to Submit',
    posting_errors: errors.join(' '),
  };
}
