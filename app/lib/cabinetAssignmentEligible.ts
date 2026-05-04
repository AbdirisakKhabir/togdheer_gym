/**
 * Whether a cabinet rental covers a given calendar day (local midnight boundary).
 * Used to block payments when the rental has ended before the payment date.
 */
export function assignmentCoversPaymentDate(
  assignment: { startDate: Date | string; endDate: Date | string | null },
  paymentCalendarDate: Date | string
): boolean {
  const d = new Date(paymentCalendarDate);
  d.setHours(0, 0, 0, 0);
  const start = new Date(assignment.startDate);
  start.setHours(0, 0, 0, 0);
  if (start > d) return false;
  if (!assignment.endDate) return true;
  const end = new Date(assignment.endDate);
  end.setHours(0, 0, 0, 0);
  return end >= d;
}
