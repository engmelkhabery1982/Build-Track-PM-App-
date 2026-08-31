import { addCalendarDays } from './schedulePlanning.ts';

/** Returns the governed payment due date. Zero/blank terms mean due on the
 * commercial document date; negative terms are deliberately ignored. */
export function dueDateFromTerms(documentDate: string | null | undefined, paymentTermsDays: unknown): string | null {
  const terms = Math.max(0, Math.round(Number(paymentTermsDays) || 0));
  return addCalendarDays(documentDate, terms);
}
