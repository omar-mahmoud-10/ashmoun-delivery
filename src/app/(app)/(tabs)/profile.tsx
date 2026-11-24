import { useMutation, useQuery } from "convex/react";
import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { confirm } from "@/lib/confirm";
import { errorMessage } from "@/lib/errors";
import { useSignOut } from "@/lib/push";
import { colors, formatPrice, radius, space } from "@/theme";

export default function Profile() {
  const me = useQuery(api.users.me);
  const addresses = useQuery(api.addresses.mine);
  const setDefault = useMutation(api.addresses.setDefault);
  const remove = useMutation(api.addresses.remove);
  const signOut = useSignOut();
  const [error, setError] = useState<string | null>(null);
  const sortedAddresses = [...(addresses ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function onRemove(addressId: Id<"addresses">, label: string) {
    const sure = await confirm({ title: "حذف العنوان؟", message: `سيتم حذف عنوان "${label}".`, confirmLabel: "حذف" });
    if (sure) await run(() => remove({ addressId }));
  }

  function onAddAddress() {
    if (me === null) {
      if (Platform.OS === "web") {
        setError("يرجى تسجيل الدخول أولًا لإضافة عنوان.");
      } else {
        Alert.alert("سجّل الدخول أولًا", "يرجى تسجيل الدخول لإضافة عنوان.");
      }
      return;
    }
    setError(null);
    router.push({ pathname: "/select-location", params: { from: "/profile" } });
  }

  if (me === undefined) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {me === null ? (
        <View style={styles.card}>
          <AppText variant="title">مرحبًا بك 👋</AppText>
          <AppText tone="muted">يمكنك الطلب كزائر، وسجّل الدخول لحفظ عناوينك ومتابعة طلباتك.</AppText>
          <View style={styles.actions}>
            <Link href="/sign-in" asChild>
              <Button kind="primary" label="تسجيل الدخول" style={styles.grow} />
            </Link>
            <Link href="/register" asChild>
              <Button kind="secondary" label="حساب جديد" style={styles.grow} />
            </Link>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <AppText variant="title">{me.name}</AppText>
          <AppText tone="muted">{me.phone}</AppText>
        </View>
      )}

      {me !== null ? (
        <>
          <View style={styles.sectionRow}>
            <AppText variant="subtitle">عناويني</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={onAddAddress}
              hitSlop={8}
              style={styles.link}>
              <AppText variant="caption" tone="primaryInk">
                + أضف عنوان
              </AppText>
            </Pressable>
          </View>
          {sortedAddresses.map((address) => (
            <View key={address._id} style={[styles.card, address.isDefault && styles.defaultCard]}>
              <View style={styles.sectionRow}>
                <AppText variant="subtitle">
                  {address.zoneName}
                </AppText>
                {address.isDefault ? (
                  <View style={styles.defaultPill}>
                    <AppText variant="caption" style={styles.defaultPillText}>
                      العنوان الأساسي
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText tone="muted">
                {address.street}
                {address.landmark ? ` · ${address.landmark}` : ""}
              </AppText>
              <AppText variant="caption" tone={address.zoneActive ? "muted" : "danger"}>
                {address.zoneActive ? `توصيل ${formatPrice(address.deliveryFee)}` : "التوصيل متوقف في هذه المنطقة حاليًا"}
              </AppText>
              <View style={styles.actions}>
                {address.isDefault ? null : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void run(() => setDefault({ addressId: address._id }))}
                    hitSlop={8}
                    style={styles.link}>
                    <AppText variant="caption" tone="primaryInk">
                      تعيين كعنوان أساسي
                    </AppText>
                  </Pressable>
                )}
                {sortedAddresses.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void onRemove(address._id, address.label)}
                    hitSlop={8}
                    style={[styles.link, styles.remove]}>
                    <AppText variant="caption" tone="danger">
                      حذف
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </>
      ) : null}
      {error ? <AppText tone="danger">{error}</AppText> : null}
      {me?.isAdmin ? <Button kind="secondary" label="🛠️ لوحة التحكم" onPress={() => router.push("/admin")} /> : null}
      {me !== null && me !== undefined ? (
        <Button kind="danger" label="تسجيل الخروج" onPress={() => void signOut()} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: space.xxl },
  screen: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.xs,
  },
  defaultCard: { borderColor: colors.primary },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  actions: { flexDirection: "row", gap: space.sm },
  grow: { flex: 1 },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm },
  remove: { marginStart: "auto" },
  defaultPill: { paddingHorizontal: space.sm, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  defaultPillText: { color: colors.primaryInk },
});
