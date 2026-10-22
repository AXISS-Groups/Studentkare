/**
 * A test the student booked and has not paid for yet: the lab does not see it
 * (backend lab_may_see_clause), so it is "Awaiting payment", never "Booked" or
 * "Awaiting collection" (live-run audit #2).
 */
export function awaitsLabPayment(order: { status: string; paymentStatus?: string | null }): boolean {
  return order.status === 'BOOKED' && order.paymentStatus === 'UNPAID';
}
