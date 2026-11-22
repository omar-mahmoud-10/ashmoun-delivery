import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { isShopOpen } from "./lib/hours";
import { canCustomerCancel } from "./lib/orderStatus";
import { MAX_QUANTITY, priceLine } from "./lib/pricing";
import { requireUser } from "./lib/session";
import { cartSelection, geoPoint } from "./schema";

const MAX_LINES = 30;
const MAX_NOTE = 300;

const cartItems = v.array(
  v.object({
    productId: v.id("products"),
    quantity: v.number(),
    selections: v.array(cartSelection),
  }),
);

type CartItem = Infer<typeof cartItems>[number];

// Price and validate one shop's cart lines.
async function priceShopCart(ctx: QueryCtx, shop: Doc<"shops">, lines: CartItem[]) {
  if (lines.length === 0) throw new ConvexError("السلة فارغة");
  const items = [];
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new ConvexError("كمية غير صحيحة");
    }
    const product = await ctx.db.get(line.productId);
    if (product === null) throw new ConvexError("يوجد منتج في السلة أُزيل من القائمة، يرجى إزالته والمتابعة");
    if (product.shopId !== shop._id) throw new ConvexError("يوجد منتج لا ينتمي لهذا المحل");
    if (!product.available) throw new ConvexError(`${product.name} غير متاح حاليًا`);
    const priced = priceLine(product, line.selections);
    if (priced.kind === "invalid") throw new ConvexError(`تغيّرت اختيارات ${product.name}، يرجى إزالته وإضافته مرة أخرى`);
    items.push({
      productId: product._id,
      name: product.name,
      optionsLabel: priced.optionsLabel,
      unitPrice: priced.unitPrice,
      quantity: line.quantity,
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { items, subtotal };
}

export const quote = query({
  args: { items: cartItems },
  handler: async (ctx, args) => {
    if (args.items.length === 0) return { kind: "invalid" as const, message: "السلة فارغة" };
    if (args.items.length > MAX_LINES) return { kind: "invalid" as const, message: "الطلب كبير، يرجى تقسيمه" };
    // Group lines by shop.
    const byShop = new Map<Id<"shops">, CartItem[]>();
    for (const line of args.items) {
      const product = await ctx.db.get(line.productId);
      if (product === null) return { kind: "invalid" as const, message: "يوجد منتج في السلة أُزيل من القائمة" };
      const arr = byShop.get(product.shopId) ?? [];
      arr.push(line);
      byShop.set(product.shopId, arr);
    }
    const shops = [];
    for (const [shopId, lines] of byShop) {
      const shop = await ctx.db.get(shopId);
      if (shop === null) return { kind: "invalid" as const, message: "أحد المحلات غير متاح حاليًا" };
      try {
        const { subtotal } = await priceShopCart(ctx, shop, lines);
        shops.push({ shopId, shopName: shop.name, subtotal, minOrder: shop.minOrder, hours: shop.hours, paused: shop.paused });
      } catch (error) {
        if (error instanceof ConvexError && typeof error.data === "string") {
          return { kind: "invalid" as const, message: error.data };
        }
        throw error;
      }
    }
    return { kind: "ok" as const, shops };
  },
});

export const place = mutation({
  args: {
    // "delivery" orders go to a saved address or a pinned map spot; "pickup"
    // orders are collected by the customer at the shop's branch.
    fulfillment: v.optional(v.union(v.literal("delivery"), v.literal("pickup"))),
    // Logged-in customers order to a saved address; guests order to a picked
    // location with a typed street, a chosen zone, and contact info.
    addressId: v.optional(v.id("addresses")),
    zoneId: v.optional(v.id("zones")),
    street: v.optional(v.string()),
    landmark: v.optional(v.string()),
    location: v.optional(geoPoint),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    note: v.string(),
    payment: v.union(v.literal("cod"), v.literal("vfcash"), v.literal("instapay")),
    items: cartItems,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId === null ? null : await ctx.db.get(userId);

    const fulfillment = args.fulfillment ?? "delivery";

    let zone, label, street, landmark, location;
    if (fulfillment === "pickup") {
      // No destination: the customer collects the order at the shop's branch.
    } else if (user && args.addressId) {
      // A saved address wins when the customer picked one from their list.
      const address = await ctx.db.get(args.addressId);
      if (address === null || address.userId !== user._id) throw new ConvexError("العنوان غير موجود");
      zone = await ctx.db.get(address.zoneId);
      label = address.label;
      street = address.street;
      landmark = address.landmark;
      location = address.location;
    } else {
      // No saved address: the customer pinned a spot on the map. Guests always
      // arrive here; a logged-in customer lands here when they picked a spot
      // instead of one of their saved addresses.
      if (!args.zoneId) throw new ConvexError("يرجى اختيار منطقة التوصيل");
      zone = await ctx.db.get(args.zoneId);
      street = (args.street ?? "").trim();
      if (street.length < 1) throw new ConvexError("يرجى كتابة العنوان");
      location = args.location;
    }
    if (fulfillment !== "pickup" && (zone === null || zone === undefined || !zone.active))
      throw new ConvexError("التوصيل متوقف في هذه المنطقة حاليًا");

    const customerName = (args.customerName ?? user?.name ?? "").trim();
    const customerPhone = (args.customerPhone ?? user?.phone ?? "").trim();
    if (customerPhone.length < 6) throw new ConvexError("يرجى إدخال رقم جوال صحيح");

    if (args.items.length === 0) throw new ConvexError("السلة فارغة");
    if (args.items.length > MAX_LINES) throw new ConvexError("الطلب كبير، يرجى تقسيمه إلى أكثر من طلب");
    const note = args.note.trim();
    if (note.length > MAX_NOTE) throw new ConvexError(`يجب أن تكون الملاحظات أقل من ${MAX_NOTE} حرفًا`);

    // Group items by shop and create one order per shop.
    const byShop = new Map<Id<"shops">, CartItem[]>();
    for (const line of args.items) {
      const product = await ctx.db.get(line.productId);
      if (product === null) throw new ConvexError("يوجد منتج في السلة أُزيل من القائمة، يرجى إزالته والمتابعة");
      const arr = byShop.get(product.shopId) ?? [];
      arr.push(line);
      byShop.set(product.shopId, arr);
    }

    const now = Date.now();
    const orderIds = [];
    for (const [shopId, lines] of byShop) {
      const shop = await ctx.db.get(shopId);
      if (shop === null) throw new ConvexError("أحد المحلات غير موجود");
      if (shop.paused) throw new ConvexError(`${shop.name}: المحل متوقف عن استقبال الطلبات مؤقتًا`);
      if (!isShopOpen(shop, now)) throw new ConvexError(`${shop.name}: المحل مغلق حاليًا`);
      const { items, subtotal } = await priceShopCart(ctx, shop, lines);
      if (subtotal < (shop.minOrder ?? 0)) throw new ConvexError(`الحد الأدنى للطلب من ${shop.name} هو ${shop.minOrder ?? 0} ج.م`);
      const deliveryFee = fulfillment === "pickup" ? 0 : (zone?.deliveryFee ?? 0);
      const orderId = await ctx.db.insert("orders", {
        userId: user?._id,
        shopId: shop._id,
        shopName: shop.name,
        fulfillment,
        address:
          fulfillment === "pickup"
            ? undefined
            : {
                zoneName: zone?.name ?? "",
                label: label ?? "موقع الطلب",
                street: street ?? "",
                landmark: landmark ?? (args.landmark ?? "").trim(),
                location: user ? location : args.location,
              },
        customerName,
        customerPhone,
        items,
        note,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        payment: args.payment,
        status: "created",
        history: [{ status: "created", at: now, by: user?._id }],
      });
      orderIds.push(orderId);
    }
    return { orderIds };
  },
});

export const get = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const orderId = ctx.db.normalizeId("orders", args.orderId);
    const order = orderId === null ? null : await ctx.db.get(orderId);
    if (order === null) return null;
    // Owner reads their order; guest orders (no userId) are viewable by anyone
    // who has the id — ids are unguessable, and the guest has no account to
    // look the order up by.
    if (order.userId !== undefined && order.userId !== userId) return null;
    return order;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(orderId);
    if (order === null || order.userId !== user._id) throw new ConvexError("الطلب غير موجود");
    if (order.status === "cancelled") throw new ConvexError("تم إلغاء هذا الطلب مسبقًا");
    if (!canCustomerCancel(order.status)) {
      throw new ConvexError("لا يمكن إلغاء الطلب بعد تأكيد المحل، يرجى التواصل مع خدمة العملاء");
    }
    await ctx.db.patch(order._id, {
      status: "cancelled",
      history: [...order.history, { status: "cancelled", at: Date.now(), by: user._id }],
    });
  },
});
