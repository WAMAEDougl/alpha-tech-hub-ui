// What the API tells a customer about their own order. Internal notes and warehouse counts are never included.

export type JourneyStage = "to_pay" | "verifying" | "processing" | "packing" | "on_the_way" | "ready_for_pickup" | "delivered" | "picked_up" | "cancelled";

export interface PublicOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  journeyStage: JourneyStage;
  journeyLabel: string;
  lifecycleStatus: string;
  paymentStatus: string;
  paymentMethod: "MPESA_MANUAL" | "MPESA_STK" | "CASH";
  fulfillmentMode: "DELIVERY" | "PICKUP";
  deliveryAddress: string | null;
  deliveryZone: string | null;
  estimatedDays: string | null;
  deliveryResolved: boolean;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  invoiceNumber: string | null;
  rider: { name: string | null; phone: string | null } | null;
  items: { id: string; name: string; quantity: number; unitPrice: number }[];
  timeline: { stage: JourneyStage; label: string; at: string }[];
  payment: {
    instructions: { paybill: string | null; till: string | null; account: string; amount: number } | null;
    canSubmitCode: boolean;
    submittedCode: string | null;
    awaitingVerification: boolean;
  };
  returnEligible: boolean;
  hasReturn: boolean;
  /** total already refunded to the customer for this order */
  refundedAmount: number;
  handedOver: boolean;
  pickup: boolean;
}

/** The steps a customer sees for an order, depending on how it reaches them. */
export function journeySteps(pickup: boolean, paysByMpesa: boolean) {
  return [
    ...(paysByMpesa ? [{ stages: ["to_pay", "verifying"], label: "Payment" }] : []),
    { stages: ["processing"], label: "Confirmed" },
    { stages: ["packing"], label: "Being packed" },
    { stages: pickup ? ["ready_for_pickup"] : ["on_the_way"], label: pickup ? "Ready for pickup" : "Out for delivery" },
    { stages: pickup ? ["picked_up"] : ["delivered"], label: pickup ? "Picked up" : "Delivered" },
  ];
}

export const STAGE_ORDER: JourneyStage[] = ["to_pay", "verifying", "processing", "packing", "on_the_way", "ready_for_pickup", "delivered", "picked_up"];
