import { colors, fonts, radius, space } from "@/theme";
import { useCallback, useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "./app-text";

const HEADER_TOP = 56;
const SLOT_SIZE = 56;

export type CartTourPosition = "header" | "floating";

export function CartTour({
  visible,
  onDismiss,
  position = "header",
}: { visible: boolean; onDismiss: () => void; position?: CartTourPosition }) {
  const [pulse] = useState(() => new Animated.Value(1));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const handleDismiss = useCallback(async () => {
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  const isHeader = position === "header";
  const highlightTop = isHeader ? HEADER_TOP : insets.top + space.md;
  const highlightLeft = isHeader ? space.sm : space.lg;
  const cardTop = isHeader ? HEADER_TOP + SLOT_SIZE + space.sm * 3 : highlightTop + SLOT_SIZE + space.sm * 2;
  const cardLeft = isHeader ? space.lg : space.lg;
  const arrowTop = isHeader ? HEADER_TOP + SLOT_SIZE + space.xs : highlightTop + SLOT_SIZE + space.xs;
  const arrowLeft = isHeader ? space.sm + SLOT_SIZE / 2 - 6 : space.lg + SLOT_SIZE / 2 - 6;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.highlightGlow,
          { top: highlightTop - 10, left: highlightLeft - 10, transform: [{ scale: pulse }] },
        ]}
      />
      <Animated.View
        style={[
          styles.highlight,
          { top: highlightTop, left: highlightLeft, transform: [{ scale: pulse }], borderColor: colors.primary },
        ]}
      />
      <View style={[styles.highlightFill, { top: highlightTop, left: highlightLeft, backgroundColor: colors.primary }]} />
      <View style={[styles.arrow, { top: arrowTop, left: arrowLeft }]} />
      <View style={[styles.card, { top: cardTop, left: cardLeft }]}>
        <AppText variant="subtitle" tone="ink" style={styles.title}>
          سلة مشترياتك
        </AppText>
        <AppText variant="caption" tone="muted" style={styles.body}>
          اضغط هنا عشان تلاقى كل المنتجات اللي ضفتها للسلة
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingHorizontal: space.lg,
    zIndex: 100,
  },
  highlight: {
    position: "absolute",
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderWidth: 4,
    borderRadius: radius.pill + 8,
  },
  highlightFill: {
    position: "absolute",
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: radius.pill + 8,
    opacity: 0.15,
  },
  highlightGlow: {
    position: "absolute",
    width: SLOT_SIZE + 20,
    height: SLOT_SIZE + 20,
    borderRadius: radius.pill + 18,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  arrow: {
    position: "absolute",
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