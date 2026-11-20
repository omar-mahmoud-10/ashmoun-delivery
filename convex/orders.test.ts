import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "سارة", phone: "01012345678", role: "customer" });
    const otherId = await ctx.db.insert("users", { name: "علي", phone: "01112345678", role: "customer" });
    const zones = await ctx.db.query("zones").collect();
    const samadoun = zones.find((z) => z.name === "سمادون")!;
    const addressId = await ctx.db.insert("addresses", {
      userId, zoneId: samadoun._id, label: "البيت", street: "شارع المدرسة", landmark: "", isDefault: true,
    });
    const otherAddressId = await ctx.db.insert("addresses", {
      userId: otherId, zoneId: samadoun._id, label: "البيت", street: "شارع النيل", landmark: "", isDefault: true,
    });
    const shops = await ctx.db.query("shops").collect();
    const products = await ctx.db.query("products").collect();
    const shop = (name: string) => shops.find((s) => s.name === name)!;
    const product = (name: string) => products.find((p) => p.name === name)!;
    return {
      userId, addressId, otherAddressId,
      // كاتشب stands in for the pruned 24/7 market: tests must not depend on the wall clock.
      market: shop("كاتشب")._id,
      sweets: shop("الأصلى")._id,
      milk: product("ميل كاتشب")._id,
      bread: product("بطاطس")._id,
      basbousa: product("مقلوبة")._id,
      fries: product("باراسيتامول 500 مجم")._id,
    };
  });
  // Open around the clock so placing orders never hits the closing-hours rule.
  const allDayHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: 0, close: 0 }));
  await t.run((ctx) => ctx.db.patch(ids.market, { hours: allDayHours }));
  const asUser = t.withIdentity({ subject: `${ids.userId}|session` });
  return { t, asUser, ...ids };
}

const line = (productId: Id<"products">, quantity = 1) => ({ productId, quantity, selections: [] });

describe("orders.quote", () => {
  test("prices the cart from current product data", async () => {
    const { t, asUser, market, milk } = await setup();
    await t.run((ctx) => ctx.db.patch(milk, { price: 50 }));
    const res = await asUser.query(api.orders.quote, { items: [line(milk, 2)] });
    expect(res.kind).toBe("ok");
    if (res.kind === "ok") {
      const shop = res.shops.find((s) => s.shopId === market);
      expect(shop).toMatchObject({ subtotal: 100, minOrder: 30, paused: false });
    }
  });

  test("explains a removed product", async () => {
    const { t, asUser, milk } = await setup();
    await t.run((ctx) => ctx.db.delete(milk));
    expect(await asUser.query(api.orders.quote, { items: [line(milk)] })).toMatchObject({
      kind: "invalid",
      message: expect.stringContaining("أُزيل"),
    });
  });
});

describe("orders.place", () => {
  test("prices items on the server and adds the zone delivery fee", async () => {
    const { asUser, market, addressId, milk, bread } = await setup();
    const res = await asUser.mutation(api.orders.place, {
      addressId, note: " بسرعة ", items: [line(milk, 2), line(bread)], payment: "cod",
    });
    expect(res.orderIds).toHaveLength(1);
    const order = await asUser.query(api.orders.get, { orderId: res.orderIds[0] });
    expect(order).toMatchObject({
      subtotal: 175, deliveryFee: 15, total: 190, payment: "cod", status: "created", note: "بسرعة",
      address: { zoneName: "سمادون" }, customerPhone: "01012345678",
      shopId: market,
    });
    expect(order?.history).toHaveLength(1);
  });

  test("allows items from different shops and creates one order per shop", async () => {
    const { asUser, market, sweets, addressId, milk, fries } = await setup();
    const res = await asUser.mutation(api.orders.place, {
      addressId, note: "", items: [line(milk), line(fries)], payment: "cod",
    });
    expect(res.orderIds).toHaveLength(2);
    const orders = await Promise.all(res.orderIds.map((id) => asUser.query(api.orders.get, { orderId: id })));
    const shopIds = orders.map((o) => o?.shopId).sort();
    expect(shopIds).toEqual([market, sweets].sort());
  });

  test("rejects a closed (paused) shop", async () => {
    const { asUser, sweets, addressId, basbousa } = await setup();
    await expect(
      asUser.mutation(api.orders.place, { addressId, note: "", items: [line(basbousa)], payment: "cod" }),
    ).rejects.toThrow("متوقف");
  });

  test("rejects a shop outside its hours", async () => {
    const { t, asUser, market, addressId, milk } = await setup();
    await t.run((ctx) => ctx.db.patch(market, { hours: [] }));
    await expect(
      asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk)], payment: "cod" }),
    ).rejects.toThrow("مغلق");
  });

  test("rejects a subtotal under the shop's minimum order", async () => {
    const { asUser, market, addressId, bread } = await setup();
    await expect(
      asUser.mutation(api.orders.place, { addressId, note: "", items: [line(bread)], payment: "cod" }),
    ).rejects.toThrow("الحد الأدنى");
  });

  test("rejects someone else's address and bad quantities", async () => {
    const { asUser, market, addressId, otherAddressId, milk } = await setup();
    await expect(
      asUser.mutation(api.orders.place, { addressId: otherAddressId, note: "", items: [line(milk)], payment: "cod" }),
    ).rejects.toThrow("العنوان");
    await expect(
      asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk, 0.5)], payment: "cod" }),
    ).rejects.toThrow("كمية");
  });

  test("other users can't read the order", async () => {
    const { t, asUser, market, addressId, milk } = await setup();
    const res = await asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk)], payment: "cod" });
    const orderId = res.orderIds[0];
    const otherId = await t.run(async (ctx) => (await ctx.db.query("users").collect())[1]._id);
    expect(await t.withIdentity({ subject: `${otherId}|s` }).query(api.orders.get, { orderId })).toBeNull();
  });
});

describe("guest orders", () => {
  // No identity: convexTest queries run signed out unless withIdentity is used.
  test("guests can price the cart and place an order to a picked location", async () => {
    const { t, market, milk, bread } = await setup();
    const zoneId = await t.run(async (ctx) => {
      const zones = await ctx.db.query("zones").collect();
      return zones.find((z) => z.name === "سمادون")!._id;
    });
    const items = [line(milk, 2), line(bread)];

    const q = await t.query(api.orders.quote, { items });
    expect(q.kind).toBe("ok");
    if (q.kind === "ok") expect(q.shops.some((s) => s.shopId === market && s.subtotal === 175)).toBe(true);

    const res = await t.mutation(api.orders.place, {
      zoneId,
      street: "شارع السوق، عمارة 4",
      location: { lat: 30.1, lng: 31.2 },
      customerName: "زائر",
      customerPhone: "01000000000",
      note: "",
      payment: "cod",
      items,
    });
    const orderId = res.orderIds[0];
    const order = await t.query(api.orders.get, { orderId });
    // Convex omits the field entirely for guests rather than storing null.
    expect(order?.userId).toBeUndefined();
    expect(order).toMatchObject({
      customerName: "زائر",
      customerPhone: "01000000000",
      subtotal: 175, deliveryFee: 15, total: 190, status: "created",
      address: { zoneName: "سمادون", street: "شارع السوق، عمارة 4" },
    });
    // The unguessable id is the only credential a guest has, so the order is
    // readable signed-out (above) or signed-in; privacy for user orders is
    // covered by the "other users can't read the order" test.
    expect(await t.withIdentity({ subject: "999|x" }).query(api.orders.get, { orderId })).toMatchObject({ _id: orderId });
  });

  test("guest orders require a zone, an address, and a phone", async () => {
    const { t, market, milk } = await setup();
    await expect(
      t.mutation(api.orders.place, { street: "شارع", customerPhone: "0100", note: "", items: [line(milk)], payment: "cod" }),
    ).rejects.toThrow("منطقة");
    const zoneId = await t.run(async (ctx) => (await ctx.db.query("zones").collect())[0]._id);
    await expect(
      t.mutation(api.orders.place, { zoneId, customerPhone: "0100", note: "", items: [line(milk)], payment: "cod" }),
    ).rejects.toThrow("العنوان");
    await expect(
      t.mutation(api.orders.place, { zoneId, street: "شارع", customerPhone: "0100", note: "", items: [line(milk)], payment: "cod" }),
    ).rejects.toThrow("جوال");
  });
});

describe("orders.cancel", () => {
  test("customers can cancel while the order is created, not after it's confirmed", async () => {
    const { t, asUser, market, addressId, milk } = await setup();
    const firstRes = await asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk)], payment: "cod" });
    const first = firstRes.orderIds[0];
    await asUser.mutation(api.orders.cancel, { orderId: first });
    expect((await asUser.query(api.orders.get, { orderId: first }))?.status).toBe("cancelled");
    await expect(asUser.mutation(api.orders.cancel, { orderId: first })).rejects.toThrow("مسبقًا");

    const secondRes = await asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk)], payment: "cod" });
    const second = secondRes.orderIds[0];
    await t.run((ctx) => ctx.db.patch(second, { status: "confirmed" }));
    await expect(asUser.mutation(api.orders.cancel, { orderId: second })).rejects.toThrow("لا يمكن");
  });

  test("other users can't cancel someone's order", async () => {
    const { t, asUser, market, addressId, milk } = await setup();
    const res = await asUser.mutation(api.orders.place, { addressId, note: "", items: [line(milk)], payment: "cod" });
    const orderId = res.orderIds[0];
    const otherId = await t.run(async (ctx) => (await ctx.db.query("users").collect())[1]._id);
    await expect(
      t.withIdentity({ subject: `${otherId}|s` }).mutation(api.orders.cancel, { orderId }),
    ).rejects.toThrow("غير موجود");
  });
});
