import { useMutation, useQuery } from "convex/react";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isOpenAt } from "@/convex/lib/hours";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { FormScreen } from "@/components/form-screen";
import { PriceSummary } from "@/components/price-summary";
import { TextField } from "@/components/text-field";
import { cartCount, cartShops, cartSubtotal, useCart } from "@/lib/cart";import { errorMessage } from "@/lib/errors";
import { useLocationPicker, type PickedLocation } from "@/lib/location-picker";
import { useNow } from "@/lib/use-now";
import { colors, formatPrice, radius, space } from "@/theme";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const pickedFromStore = useLocationPicker((s) => s.picked);
  const [pickedLoc, setPickedLoc] = useState<PickedLocation | null>(null);
  const deliverable = addresses?.filter((a) => a.zoneActive) ?? [];
  const address =
    deliverable.find((a) => a._id === chosenId) ?? deliverable.find((a) => a.isDefault) ?? deliverable[0];
  const guest = me === null;
  const [showItems, setShowItems] = useState(false);
  const count = cartCount(lines);
  const shops = cartShops(lines);

  useFocusEffect(
    useCallback(() => {
      if (pickedFromStore) setPickedLoc(pickedFromStore);
    }, [pickedFromStore]),
  );

  function openLocationPicker() {
    router.push({ pathname: "/select-location", params: { direct: "1" } });
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
    if (!placed && lines.length === 0) {
      router.replace("/");
    }
  }, [placed, lines.length]);

  async function submit() {
    if (lines.length === 0 || placing) return;
    if (!guest && !address) return;
    if (guest && (!pickedLoc?.zoneId || !pickedLoc?.address || phone.trim().length < 6)) return;
    setError(null);
    setPlacing(true);
    try {
      const res = await place({
        addressId: guest ? undefined : address?._id,
        zoneId: guest ? pickedLoc?.zoneId : undefined,
        street: guest ? (pickedLoc?.address ?? "") : undefined,
        location:
          guest && pickedLoc?.lat !== undefined && pickedLoc?.lng !== undefined
            ? { lat: pickedLoc.lat, lng: pickedLoc.lng }
            : undefined,
        customerName: guest ? name.trim() : undefined,
        customerPhone: guest ? phone.trim() : undefined,
        note,
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

  const guestReady = !!pickedLoc?.zoneId && !!pickedLoc?.address && phone.trim().length >= 6;
  const deliveryFeePerOrder = guest ? pickedLoc?.deliveryFee : address?.deliveryFee;
  const shopCount = shops.length;
  const deliveryFee =
    deliveryFeePerOrder !== undefined ? deliveryFeePerOrder * Math.max(1, shopCount) : undefined;
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

  const problems = [quoteProblem, ...shopProblems.values()].filter(Boolean) as string[];

  return (
    <FormScreen
      footer={
        <>
          {problems.length > 0 || error ? (
            <View style={{ gap: 4 }}>
              {problems.map((p, i) => (
                <AppText key={i} tone="danger">
                  {p}
                </AppText>
              ))}
              {error ? <AppText tone="danger">{error}</AppText> : null}
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
            disabled={(guest ? !guestReady : !address) || hasBlocking}
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
              <AppText variant="caption" tone="primary">
                {showItems ? "إخفِ المنتجات" : "اعرض المنتجات"}
              </AppText>
              <AppText style={styles.chevron}>{showItems ? "▴" : "▾"}</AppText>
            </View>
            {showItems ? (
              <View style={styles.itemsList}>
                {(grouped ?? []).map((g) => (
                  <View key={g?.shopId ?? g?.shopName ?? "shop"} style={styles.shopGroup}>
                    <AppText variant="subtitle">{g?.shopName ?? "محل"}</AppText>
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
        {guest ? (
          <>
            <AppText variant="subtitle">التوصيل إلى</AppText>
            {pickedLoc ? (
              <View style={[styles.option, styles.locationCard]}>
                <AppText variant="subtitle">📍 موقعك على الخريطة</AppText>
                <AppText variant="caption" tone="muted" numberOfLines={2}>
                  {pickedLoc.address ??
                    (pickedLoc.lat !== undefined && pickedLoc.lng !== undefined
                      ? `${pickedLoc.lat.toFixed(5)}, ${pickedLoc.lng.toFixed(5)}`
                      : "")}
                </AppText>
                {pickedLoc.zoneName ? (
                  <AppText variant="caption" tone="muted">
                    {pickedLoc.zoneName} · توصيل {formatPrice(pickedLoc.deliveryFee ?? 0)}
                  </AppText>
                ) : null}
                <Button kind="secondary" label="تغيير الموقع" onPress={openLocationPicker} />
              </View>
            ) : (
              <Button kind="secondary" label="اختر موقعك على الخريطة" onPress={openLocationPicker} />
            )}

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
          </>
        ) : (
          <>
            <AppText variant="subtitle">التوصيل إلى</AppText>
            {addresses?.map((a) => {
              const selected = a._id === address?._id;
              return (
                <Pressable
                  key={a._id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !a.zoneActive }}
                  disabled={!a.zoneActive}
                  onPress={() => setChosenId(a._id)}
                  style={[styles.option, styles.addressOption, selected && styles.optionOn]}>
                  <View style={[styles.radio, selected && styles.radioOn]} />
                  <View style={styles.optionBody}>
                    <AppText variant="subtitle">
                      {a.label} · {a.zoneName}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {a.street}
                      {a.landmark ? ` · ${a.landmark}` : ""}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone={a.zoneActive ? "muted" : "danger"}>
                    {a.zoneActive ? `توصيل ${formatPrice(a.deliveryFee)}` : "التوصيل متوقف هنا"}
                  </AppText>
                </Pressable>
              );
            })}

            {addresses !== undefined && deliverable.length === 0 ? (
              <Button kind="secondary" label="اختر موقعك على الخريطة" onPress={() => router.push("/select-location")} />
            ) : null}
          </>
        )}

        <View style={styles.payment}>
          <AppText variant="subtitle">طريقة الدفع</AppText>
          <View style={styles.option}>
            <AppText variant="subtitle">💵 نقدًا عند الاستلام</AppText>
            <AppText variant="caption" tone="muted">
              ادفع للمندوب عند وصول الطلب.
            </AppText>
          </View>
        </View>

        <TextField
          label="ملاحظات للمحل أو المندوب (اختياري)"
          placeholder="مثال: بدون بصل"
          value={note}
          onChangeText={setNote}
          maxLength={300}
          multiline
        />

        <PriceSummary subtotal={subtotal} deliveryFee={deliveryFee} />
      </ScrollView>
    </FormScreen>
  );
}

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
  locationCard: { gap: space.sm },
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
  itemsList: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.md,
  },
  shopGroup: { gap: space.xs },
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
});
