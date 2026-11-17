import { AppText } from "@/components/app-text";
import { useLocationPicker } from "@/lib/location-picker";
import { colors, radius, space } from "@/theme";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

// The hub for choosing how to provide a delivery address. Each option opens
// its own page; when one of them confirms a pick, this hub pops itself back
// to the caller (checkout, home, ...) automatically.
export default function SelectLocation() {
  const { direct } = useLocalSearchParams<{ direct?: string }>();
  const openedAt = useRef(0);
  const picked = useLocationPicker((s) => s.picked);

  // Prefill params so a previous pick survives re-editing through the chain.
  function prefill(): Record<string, string> {
    const p: Record<string, string> = {};
    if (picked?.lat !== undefined && picked?.lng !== undefined) {
      p.lat = String(picked.lat);
      p.lng = String(picked.lng);
    }
    if (picked?.address) p.address = picked.address;
    if (direct) p.direct = direct;
    return p;
  }

  useFocusEffect(
    useCallback(() => {
      // Record when the hub first opened; a pick confirmed after that means a
      // child page just finished — return to whoever opened the flow.
      if (openedAt.current === 0) openedAt.current = Date.now();
      if (picked?.at !== undefined && picked.at > openedAt.current) router.back();
    }, [picked]),
  );

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: "تحديد الموقع", headerTransparent: false }} />

      <AppText variant="subtitle" tone="muted">
       اختر خيار من اثنين
      </AppText>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/select-map", params: prefill() })}
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
        onPress={() => router.push({ pathname: "/type-address", params: prefill() })}
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
