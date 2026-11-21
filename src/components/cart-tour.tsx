import AsyncStorage from "@react-native-async-storage/async-storage";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { colors, fonts, radius, space } from "@/theme";
import { AppText } from "./app-text";

const STORAGE_KEY = "@cart_tour_seen";

// Approximate native header bar height where the cart button lives.
const HEADER_TOP = 56;

// Size of the slot that wraps the cart button (see cart-header-button.tsx).
const SLOT_SIZE = 56;

export function CartTour({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => setDismissed(value === "1"));
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, dismissed, pulse]);

  const handleDismiss = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
    onDismiss();
  }, [onDismiss]);

  if (!visible || dismissed) return null;

  return (
    <View style={styles.overlay}>
      {/* Spotlight ring around the cart icon (top-left in RTL). */}
      <Animated.View
        style={[
          styles.highlight,
          { transform: [{ scale: pulse }], borderColor: colors.primary },
        ]}
      />
      <View style={[styles.highlightFill, { backgroundColor: colors.primary }]} />
      <View style={styles.arrow} />
      <View style={styles.card}>
        <AppText variant="subtitle" tone="ink" style={styles.title}>
          سلة مشترياتك
        </AppText>
        <AppText variant="caption" tone="muted" style={styles.body}>
          كل صنف تضيفه يظهر هنا في السلة. اضغط عليها لمراجعة طلبك قبل الدفع.
        </AppText>
        <Pressable style={styles.close} onPress={handleDismiss} accessibilityLabel="إغلاق الجولة">
          <AppText variant="subtitle" tone="onPrimary" style={styles.closeText}>
            فهمت
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: HEADER_TOP + space.xs,
    paddingHorizontal: space.lg,
    zIndex: 100,
  },
  highlight: {
    position: "absolute",
    top: HEADER_TOP,
    left: space.sm,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderWidth: 2.5,
    borderRadius: radius.pill + 4,
  },
  highlightFill: {
    position: "absolute",
    top: HEADER_TOP,
    left: space.sm,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: radius.pill + 4,
    opacity: 0.1,
  },
  arrow: {
    position: "absolute",
    top: HEADER_TOP + SLOT_SIZE + space.xs,
    left: space.sm + SLOT_SIZE / 2 - 6,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderWidth: 10,
    borderColor: "transparent",
    borderTopColor: colors.primary,
    borderBottomWidth: 0,
  },
  card: {
    position: "absolute",
    top: HEADER_TOP + SLOT_SIZE + space.sm * 3,
    left: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    maxWidth: 300,
    alignSelf: "flex-start",
  },
  title: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted },
  close: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginTop: space.xs,
  },
  closeText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
