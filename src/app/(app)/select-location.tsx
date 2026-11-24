import { AppText } from "@/components/app-text";
import { useLocationPicker } from "@/lib/location-picker";
import { colors, radius, space } from "@/theme";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { returnToOrigin } from "@/lib/navigation";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

// The hub for choosing how to provide a delivery address. Each option opens
// its own page; when one of them confirms a pick, this hub pops itself back
// to the caller (checkout, home, ...) automatically.
export default function SelectLocation() {
  const { from, addressId } = useLocalSearchParams<{ from?: string; addressId?: string }>();
  const openedAt = useRef(0);
  const picked = useLocationPicker((s) => s.picked);
  const addresses = useQuery(api.addresses.mine);

  function getPrefillAddress() {
    // First priority: explicitly passed addressId (from checkout selection)
    if (addressId) {
      const addr = addresses?.find((a) => a._id === addressId);
      if (addr) return addr;
    }
    // Second priority: default address
    const defaultAddr = addresses?.find((a) => a.isDefault);
    if (defaultAddr?.location) return defaultAddr;
    // Third priority: first deliverable address
    const firstDeliverable = addresses?.find((a) => a.zoneActive && a.location);
    if (firstDeliverable) return firstDeliverable;
    // Fall back to picked location from store
    return null;
  }

  // Coordinates prefill keeps the map centred on the last pick. The address
  // text is only carried over for the map (it labels the pin) — never into the
  // typing field, so nothing is auto-filled there. `from` rides along so the
  // child pages can return straight to the page that opened this flow.
  function prefill(withAddress: boolean): Record<string, string> {
    const p: Record<string, string> = {};
    const prefillAddr = getPrefillAddress();
    if (prefillAddr?.location) {
      p.lat = String(prefillAddr.location.lat);
      p.lng = String(prefillAddr.location.lng);
    } else if (picked?.lat !== undefined && picked?.lng !== undefined) {
      p.lat = String(picked.lat);
      p.lng = String(picked.lng);
    }
    if (withAddress && prefillAddr?.street) {
      p.address = prefillAddr.street;
    } else if (withAddress && picked?.address) {
      p.address = picked.address;
    }
    if (from) p.from = from;
    return p;
  }

  useFocusEffect(
    useCallback(() => {
      // Record when the hub first opened; a pick confirmed after that means a
      // child page just finished — return to whoever opened the flow.
      if (openedAt.current === 0) openedAt.current = Date.now();
      if (picked?.at !== undefined && picked.at > openedAt.current) returnToOrigin(from);
    }, [picked, from]),
  );

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: "تحديد الموقع", headerTransparent: false }} />

      <AppText variant="subtitle" tone="muted">
       اختر خيار من اثنين
      </AppText>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/select-map", params: prefill(true) })}
        style={styles.card}>
        <AppText style={styles.emoji}>📍</AppText>
        <View style={styles.cardBody}>
          <AppText variant="subtitle">تحديد العنوان من الخريطة</AppText>
          <AppText variant="caption" tone="muted">
            انقر على الخريطة أو استخدم موقعك الحالي
          </AppText>
        </View>
        <AppText tone="muted">‹</AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/type-address", params: prefill(false) })}
        style={styles.card}>
        <AppText style={styles.emoji}>⌨️</AppText>
        <View style={styles.cardBody}>
          <AppText variant="subtitle">كتابة العنوان</AppText>
          <AppText variant="caption" tone="muted">
            اكتب عنوانك بالتفصيل واختر منطقتك
          </AppText>
        </View>
        <AppText tone="muted">‹</AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.xl, gap: space.md },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardBody: { flex: 1, gap: 2 },
  emoji: { fontSize: 32 },
});
