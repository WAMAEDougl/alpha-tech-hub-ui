// How a shopper sees an order: a simple journey worked out from the order's real state.
// One source of truth, used by the tracking page, the account order list and the notifications.

export type JourneyStage =
  | 'to_pay'
  | 'verifying'
  | 'processing'
  | 'packing'
  | 'on_the_way'
  | 'ready_for_pickup'
  | 'delivered'
  | 'picked_up'
  | 'cancelled';

export const STAGE_LABEL: Record<JourneyStage, string> = {
  to_pay: 'Awaiting payment',
  verifying: 'Verifying payment',
  processing: 'Confirmed',
  packing: 'Being packed',
  on_the_way: 'Out for delivery',
  ready_for_pickup: 'Ready for pickup',
  delivered: 'Delivered',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

/** Tabs on the customer's "My orders" page. */
export function tabOf(stage: JourneyStage): 'to_pay' | 'to_ship' | 'to_receive' | 'delivered' | 'cancelled' {
  switch (stage) {
    case 'to_pay':
    case 'verifying': return 'to_pay';
    case 'processing':
    case 'packing': return 'to_ship';
    case 'on_the_way':
    case 'ready_for_pickup': return 'to_receive';
    case 'delivered':
    case 'picked_up': return 'delivered';
    default: return 'cancelled';
  }
}

export function journeyStage(o: { lifecycleStatus: string; workflowStage: string; fulfillmentMode: string }): JourneyStage {
  const { lifecycleStatus: life, workflowStage: stage } = o;
  const pickup = o.fulfillmentMode === 'PICKUP';
  if (life === 'CANCELLED' || life === 'STALE') return 'cancelled';
  if (life === 'COMPLETED') return pickup ? 'picked_up' : 'delivered';
  if (stage === 'DISPATCHED') return 'on_the_way';
  if (stage === 'READY_PICKUP') return 'ready_for_pickup';
  if (stage === 'PACKING' || stage === 'PACKED') return 'packing';
  if (life === 'AWAITING_VERIFICATION') return 'verifying';
  if (life === 'AWAITING_PAYMENT') return 'to_pay';
  return 'processing';
}
