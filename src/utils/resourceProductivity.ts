export type ProductivityMetrics = {
  plannedProductivity: number | null;
  actualProductivity: number | null;
  variancePct: number | null;
};

/** Quantity productivity is meaningful only when both quantity and labour
 * hours are explicitly linked to the same schedule activity. */
export function calculateProductivityMetrics(input: {
  plannedQuantity?: number | null;
  plannedLaborHours?: number | null;
  actualQuantity?: number | null;
  actualLaborHours?: number | null;
}): ProductivityMetrics {
  const plannedHours = Number(input.plannedLaborHours) || 0;
  const actualHours = Number(input.actualLaborHours) || 0;
  const plannedProductivity = plannedHours > 0
    ? Math.round(((Number(input.plannedQuantity) || 0) / plannedHours) * 10000) / 10000
    : null;
  const actualProductivity = actualHours > 0
    ? Math.round(((Number(input.actualQuantity) || 0) / actualHours) * 10000) / 10000
    : null;
  return {
    plannedProductivity,
    actualProductivity,
    variancePct: plannedProductivity && actualProductivity !== null
      ? Math.round(((actualProductivity / plannedProductivity) - 1) * 10000) / 100
      : null,
  };
}
