import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { cartCount, useCart } from "@/lib/cart";
import { colors, radius, space } from "@/theme";
import { AppText } from "./app-text";

// Cart shortcut for screens whose header replaces the floating cart bar.
export function CartHeaderButton() {
  const lines = useCart((s) => s.lines);
  const count = cartCount(lines);
  const empty = count === 0;
  const [pulse] = useState(() => new Animated.Value(1));

  // Always breathe so the cart stays noticeable whether or not it has items.
  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 450, useNativeDriver }),
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={empty ? "السلة فارغة" : `السلة، ${count} منتجات`}
        accessibilityState={{ disabled: empty }}
        disabled={empty}
        hitSlop={8}
        style={[styles.button, empty && styles.empty]}
        onPress={() => router.push("/checkout")}>
        <Ionicons name="cart-outline" size={26} color={colors.ink} />
        {count > 0 && (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{count}</AppText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  empty: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
});
