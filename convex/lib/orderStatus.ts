import { v, type Infer } from "convex/values";

export const orderStatus = v.union(
  v.literal("created"),
  v.literal("confirmed"),
  v.literal("with_driver"),
  v.literal("delivered"),
  v.literal("returned"),
  v.literal("cancelled"),
);

export type OrderStatus = Infer<typeof orderStatus>;

export type Fulfillment = "delivery" | "pickup";

export const nextStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ["confirmed", "cancelled"],
  confirmed: ["with_driver", "cancelled"],
  with_driver: ["delivered", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};

// Pickup orders have no driver: the shop hands them over at the branch, so they
// go straight from confirmed to handed over (delivered).
const pickupNextStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  with_driver: ["delivered", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};

export function getNextStatuses(status: OrderStatus, fulfillment: Fulfillment = "delivery") {
  return (fulfillment === "pickup" ? pickupNextStatuses : nextStatuses)[status];
}

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: Fulfillment = "delivery") {
  return getNextStatuses(from, fulfillment).includes(to);
}

export function canCustomerCancel(status: OrderStatus) {
  return status === "created";
}

export const statusLabels: Record<OrderStatus, string> = {
  created: "تم الإنشاء",
  confirmed: "مؤكد",
  with_driver: "مع المندوب",
  delivered: "تم التسليم",
  returned: "مُرتجَع",
  cancelled: "ملغي",
};
