import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { FormScreen } from "@/components/form-screen";
import { PriceSummary } from "@/components/price-summary";
import { TextField } from "@/components/text-field";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isOpenAt } from "@/convex/lib/hours";
import { cartCount, cartShops, cartSubtotal, useCart } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { useGuest } from "@/lib/guest";
import { useLocationPicker } from "@/lib/location-picker";
import { useNow } from "@/lib/use-now";
import { colors, formatPrice, radius, space } from "@/theme";
import { useMutation, useQuery } from "convex/react";
import { router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

export default function Checkout() {
  const { lines, clear, setQuantity } = useCart();
  const me = useQuery(api.users.me);
  const addresses = useQuery(api.addresses.mine);
  const place = useMutation(api.orders.place);
  const now = useNow();
  const quote = useQuery(
    api.orders.quote,
    lines.length > 0
      ? { items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections })) }
      : "skip",
  );

  const [chosenId, setChosenId] = useState<Id<"addresses"> | null>(null);
  const name = useGuest((s) => s.name);
  const phone = useGuest((s) => s.phone);
  const setName = useGuest((s) => s.setName);
  const setPhone = useGuest((s) => s.setPhone);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "vfcash" | "instapay">("cod");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCart.persist.onFinishHydration(() => setHydrated(true));
    if (useCart.persist.hasHydrated()) setHydrated(true);
    return () => { unsub(); };
  }, []);
  // Read the pick straight from the store instead of copying it into local state:
  // the map confirms by writing the store and navigating back in the same tick, so
  // a focus-effect copy could run before the new value was rendered and drop it.
  const pickedLoc = useLocationPicker((s) => s.picked);
  const setPicked = useLocationPicker((s) => s.setPicked);
  const deliverable = addresses?.filter((a) => a.zoneActive) ?? [];
  const address =
    deliverable.find((a) => a._id === chosenId) ?? deliverable.find((a) => a.isDefault) ?? deliverable[0];
  const guest = me === null;
  const [showItems, setShowItems] = useState(false);
  const count = cartCount(lines);
  const shops = cartShops(lines);

  function openLocationPicker() {
    router.push({ pathname: "/select-location", params: { from: "/checkout" } });
  }

  const shopProblems = useMemo(() => {
    const map = new Map<string, string>();
    if (quote?.kind === "ok") {
      for (const s of quote.shops) {
        if (s.paused) map.set(s.shopId, `${s.shopName}: المحل متوقف مؤقتًا`);
        else if (!isOpenAt(s.hours, now)) map.set(s.shopId, `${s.shopName}: المحل مغلق حاليًا`);
        else if (s.subtotal < (s.minOrder ?? 0))
          map.set(s.shopId, `${s.shopName}: الحد الأدنى ${formatPrice(s.minOrder ?? 0)}`);
      }
    }
    return map;
  }, [quote, now]);

  const quoteProblem = quote?.kind === "invalid" ? quote.message : null;
  const hasBlocking = quoteProblem !== null || quote === undefined || shopProblems.size > 0;

  const subtotal =
    quote?.kind === "ok" ? quote.shops.reduce((sum, s) => sum + s.subtotal, 0) : cartSubtotal(lines);

  useEffect(() => {
    if (!placed && hydrated && lines.length === 0) {
      router.replace("/");
    }
  }, [placed, hydrated, lines.length]);

  async function submit() {
    if (lines.length === 0 || placing) return;
    if (fulfillment === "delivery") {
      // A spot confirmed on the map is the destination; otherwise a saved address is.
      const pin = pickedLoc !== null;
      if (pin && (!pickedLoc.zoneId || !pickedLoc.address)) return;
      if (guest ? !pin || phone.trim().length < 6 : !pin && !address) return;
    } else if (guest && phone.trim().length < 6) {
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const pin = pickedLoc !== null;
      const res = await place({
        fulfillment,
        addressId: fulfillment === "delivery" && !pin && !guest ? address?._id : undefined,
        zoneId: fulfillment === "delivery" && (pin || guest) ? pickedLoc?.zoneId : undefined,
        street: fulfillment === "delivery" && (pin || guest) ? (pickedLoc?.address ?? "") : undefined,
        location:
          fulfillment === "delivery" && pin && pickedLoc?.lat !== undefined && pickedLoc?.lng !== undefined
            ? { lat: pickedLoc.lat, lng: pickedLoc.lng }
            : undefined,
        customerName: guest ? name.trim() : undefined,
        customerPhone: guest ? phone.trim() : undefined,
        note,
        payment: paymentMethod,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections })),
      });
      setPlaced(true);
      clear();
      useLocationPicker.getState().setPicked(null);
      router.dismissAll();
      const ids = (res as { orderIds?: string[] })?.orderIds ?? [];
      if (ids.length === 1) {
        router.push({ pathname: "/order/[id]/success", params: { id: ids[0] } });
      } else {
        router.push("/orders");
      }
    } catch (e) {
      setError(errorMessage(e));
      setPlacing(false);
    }
  }

  // A confirmed map spot is ready once it has a zone and an address (guests also
  // need a phone number they typed); otherwise a saved address is required.
  const destinationReady =
    fulfillment === "pickup"
      ? !guest || phone.trim().length >= 6
      : pickedLoc
        ? !!pickedLoc.zoneId && !!pickedLoc.address && (!guest || phone.trim().length >= 6)
        : !guest && !!address;
  const deliveryFeePerOrder = pickedLoc ? pickedLoc.deliveryFee : address?.deliveryFee;
  const shopCount = shops.length;
  const deliveryFee =
    fulfillment === "pickup"
      ? 0
      : deliveryFeePerOrder !== undefined
        ? deliveryFeePerOrder + 5 * Math.max(0, shopCount - 1)
        : undefined;
  const total = subtotal !== undefined && deliveryFee !== undefined ? subtotal + deliveryFee : undefined;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof lines>();
    for (const l of lines) {
      const arr = map.get(l.shopId) ?? [];
      arr.push(l);
      map.set(l.shopId, arr);
    }
    return [...map.entries()].map(([shopId, items]) => ({
      shopId,
      shopName: items[0]?.shopName || "محل",
      items,
    }));
  }, [lines]);

  const problems = [quoteProblem, ...shopProblems.values()].filter(
    (p): p is string => typeof p === "string" && p.length > 0 && p !== "يرجى تحديد المحل",
  );
  const visibleError = error === "يرجى تحديد المحل" ? null : error;

  return (
    <FormScreen
      footer={
        <>
          {problems.length > 0 || visibleError ? (
            <View style={{ gap: 4 }}>
              {problems.map((p, i) => (
                <AppText key={i} tone="danger">
                  {p}
                </AppText>
              ))}
              {visibleError ? <AppText tone="danger">{visibleError}</AppText> : null}
            </View>
          ) : null}
          {shopCount > 1 ? (
            <AppText variant="caption" tone="muted">
              سيتم إنشاء طلب منفصل لكل محل ({shopCount} طلبات) مع رسوم توصيل لكل طلب.
            </AppText>
          ) : null}
          <Button
            label={total !== undefined ? `تأكيد الطلب · ${formatPrice(total)}` : "تأكيد الطلب"}
            loading={placing}
            disabled={!destinationReady || hasBlocking}
            onPress={submit}
          />
        </>
      }>
      <Stack.Screen options={{ title: "إتمام الطلب" }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        {Number.isFinite(count) || lines.length > 0 ? (
          <Pressable
            accessibilityState={{ expanded: showItems }}
            onPress={() => setShowItems((v) => !v)}
            style={styles.option}>
            <View style={styles.summaryHeader}>
              <AppText variant="subtitle">ملخص السلة</AppText>
              <AppText variant="subtitle" tone="muted">
                ({count} منتج{count === 1 ? "" : "ات"} · {formatPrice(subtotal)})
              </AppText>
            </View>
            <View style={styles.showRow}>
              <AppText variant="caption" tone="primary" style={styles.showItemsText}>
                {showItems ? "إخفِ المنتجات" : "اعرض المنتجات"}
              </AppText>
              <AppText style={[styles.chevron, styles.showItemsChevron]}>{showItems ? "▴" : "▾"}</AppText>
            </View>
            {showItems ? (
              <View style={styles.itemsList}>
                {(grouped ?? []).map((g) => (
                  <View key={g?.shopId ?? g?.shopName ?? "shop"} style={styles.shopGroup}>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`فتح صفحة ${g?.shopName ?? "المحل"}`}
                      hitSlop={4}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (g?.shopId) {
                          router.push({ pathname: "/shop/[slug]", params: { slug: g.shopId } });
                        }
                      }}
                      style={styles.shopLink}>
                      <AppText variant="subtitle" tone="primary" style={styles.shopLinkText}>
                        {g?.shopName ?? "محل"}
                      </AppText>
                    </Pressable>
                    {(g?.items ?? []).map((l) => (
                      <View key={l?.key ?? l?.name ?? String(Math.random())} style={styles.itemRow}>
                        <View style={styles.itemBody}>
                          <AppText variant="caption" numberOfLines={1}>
                            {l?.quantity ?? 0}× {l?.name ?? ""}
                          </AppText>
                          {l?.optionsLabel ? (
                            <AppText variant="caption" tone="muted" numberOfLines={1}>
                              {l.optionsLabel}
                            </AppText>
                          ) : null}
                        </View>
                        <View style={styles.qtyControls}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="نقص الكمية"
                            onPress={() => setQuantity(l?.key ?? "", Math.max(0, (l?.quantity ?? 1) - 1))}
                            style={styles.qtyButton}>
                            <AppText style={styles.qtyIcon}>−</AppText>
                          </Pressable>
                          <AppText style={styles.qtyText}>{l?.quantity ?? 0}</AppText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="زد الكمية"
                            onPress={() => setQuantity(l?.key ?? "", (l?.quantity ?? 0) + 1)}
                            style={styles.qtyButton}>
                            <AppText style={styles.qtyIcon}>+</AppText>
                          </Pressable>
                        </View>
                        <AppText variant="caption" tone="muted">
                          {formatPrice((l?.unitPrice ?? 0) * (l?.quantity ?? 0))}
                        </AppText>
                      </View>
                    ))}
                    {shopProblems.get(g?.shopId ?? "") ? (
                      <AppText variant="caption" tone="danger">
                        {shopProblems.get(g?.shopId ?? "")}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        ) : null}
        <View style={styles.fulfillment}>
          <AppText variant="subtitle">طريقة الاستلام</AppText>
          {FULFILLMENT_METHODS.map((f) => (
            <Pressable
              key={f.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: fulfillment === f.value }}
              onPress={() => setFulfillment(f.value)}
              style={[styles.fulfillmentOption, fulfillment === f.value && styles.fulfillmentOptionOn]}>
              <View style={[styles.radio, fulfillment === f.value && styles.radioOn]} />
              <View style={styles.fulfillmentOptionBody}>
                <AppText variant="subtitle">{f.label}</AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {f.detail}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
        {fulfillment === "delivery" && (
          <>
            <AppText variant="subtitle">التوصيل إلى</AppText>

            {/* A spot confirmed on the map. It wins over a saved address, and tapping
                the card re-opens the map to change it. */}
            {pickedLoc ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: true }}
                accessibilityLabel="الموقع المحدد على الخريطة"
                onPress={openLocationPicker}
                style={[styles.option, styles.addressOption, styles.optionOn]}>
                <View style={[styles.radio, styles.radioOn]} />
                <View style={styles.optionBody}>
                  <AppText variant="caption" tone="primary" style={styles.zoneTop}>
                    📍 {pickedLoc?.zoneName} · {formatPrice(pickedLoc.deliveryFee ?? 0)}
                  </AppText>
                  <AppText variant="body" style={styles.streetLine} numberOfLines={1}>
                    {pickedLoc?.address}
                  </AppText>
                </View>
                <AppText variant="subtitle" tone="primary" style={{ fontWeight: "900" }}>
                  تغيير
                </AppText>
              </Pressable>
            ) : null}

            {!pickedLoc && addresses?.map((a) => {
              // Saved addresses are only active while no map spot is pinned.
              const selected = !pickedLoc && a._id === address?._id;
              return (
                <Pressable
                  key={a._id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !a.zoneActive }}
                  disabled={!a.zoneActive}
                  onPress={() => {
                    setPicked(null);
                    setChosenId(a._id);
                  }}
                  style={[styles.option, styles.addressOption, selected && styles.optionOn]}>
                  <View style={[styles.radio, selected && styles.radioOn]} />
              <View style={styles.optionBody}>
                <AppText variant="caption" tone={a.zoneActive ? "primary" : "danger"} style={styles.zoneTop}>
                  📍 {a.zoneName} · {a.zoneActive ? formatPrice(a.deliveryFee) : "التوصيل متوقف هنا"}
                </AppText>
                {a.street ? (
                  <AppText variant="body" style={styles.streetLine} numberOfLines={1}>
                    {a.street}
                  </AppText>
                ) : null}
              </View>
              </Pressable>
              );
            })}

            {!pickedLoc ? (
              <Button kind="secondary" label="اختر موقعك على الخريطة" onPress={openLocationPicker} style={styles.chooseLocationBtn} />
            ) : null}
          </>
        )}

        {guest ? (
          <View style={styles.inputs}>
            <TextField
              label="الاسم"
              placeholder="أدخل اسمك"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
            <TextField
              label="رقم الجوال"
              placeholder="01xxxxxxxxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        ) : null}

        <View style={styles.payment}>
          <AppText variant="subtitle">طريقة الدفع</AppText>
          {PAYMENT_METHODS.map((p) => (
            <Pressable
              key={p.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: paymentMethod === p.value }}
              disabled={false}
              onPress={() => setPaymentMethod(p.value)}
              style={[styles.paymentOption, paymentMethod === p.value && styles.paymentOptionOn]}>
              <View style={[styles.radio, paymentMethod === p.value && styles.radioOn]} />
              <View style={styles.paymentOptionBody}>
                <AppText variant="subtitle" style={p.value !== "cod" ? { writingDirection: "ltr" } : undefined}>
                  {p.label}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {p.detail}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>

        <TextField
          label="ملاحظات للمحل أو المندوب (اختياري)"
          placeholder="مثال: بدون بصل"
          value={note}
          onChangeText={setNote}
          maxLength={300}
          multiline
        />

        <PriceSummary subtotal={subtotal} deliveryFee={deliveryFee} pickup={fulfillment === "pickup"} />
      </ScrollView>
    </FormScreen>
  );
}

const PAYMENT_METHODS: { value: "cod" | "vfcash" | "instapay"; label: string; detail: string }[] = [
  { value: "cod", label: "نقدًا عند الاستلام", detail: "ادفع للمندوب عند وصول الطلب." },
  { value: "vfcash", label: "( 010 908 627 40 ) VF Cash", detail: "الدفع عبر تطبيق VF Cash." },
  { value: "instapay", label: "( omar.mahmoud.26 ) InstaPay", detail: "الدفع عبر تطبيق InstaPay." },
];

const FULFILLMENT_METHODS: { value: "delivery" | "pickup"; label: string; detail: string }[] = [
  { value: "delivery", label: "التوصيل", detail: "يوصل الطلب إلى باب منزلك." },
  { value: "pickup", label: "استلام من الفرع", detail: "استلم طلبك بنفسك من أقرب فرع للمحل." },
];

const styles = StyleSheet.create({
  option: {
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressOption: { flexDirection: "row", alignItems: "center", gap: space.md },
  optionBody: { flex: 1, gap: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  paymentOptionBody: { gap: 1 },
  fulfillment: { paddingTop: space.lg },
  fulfillmentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fulfillmentOptionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  fulfillmentOptionBody: { gap: 1 },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.xs,
  },
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
  },
  chevron: { fontSize: 12, color: colors.primary },
  showItemsText: { fontSize: 15, fontWeight: "600" },
  showItemsChevron: { fontSize: 16 },
  itemsList: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.md,
  },
  shopGroup: { gap: space.xs },
  shopLink: { alignSelf: "flex-start" },
  shopLinkText: { textDecorationLine: "underline" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  itemBody: { flex: 1, gap: 1 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: space.xs },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyIcon: { fontSize: 14, fontWeight: "800", color: colors.ink },
  qtyText: { fontSize: 14, fontWeight: "700", color: colors.ink, minWidth: 20, textAlign: "center" },
  inputs: { gap: space.sm },
  payment: { paddingTop: space.lg },
  zoneTop: { fontWeight: "700", fontSize: 18, marginBottom: 2 },
  streetLine: { fontSize: 13, fontWeight: "400", color: colors.ink },
  chooseLocationBtn: { marginTop: space.md },
});
