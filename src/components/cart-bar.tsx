import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart";
import { colors, space } from "@/theme";
import { AppText } from "./app-text";

const HIDDEN_PATHS = ["/checkout", "/select-map"];
// Order screens (just-placed success, tracking) must not have a floating cart over them,
// so the cart is out of the way the moment an order is confirmed.
const HIDDEN_PREFIXES = ["/order/"];
// The native animated module does not exist on web, where the JS driver is used instead.
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function CartBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const lines = useCart((s) => s.lines);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const isHidden =
      HIDDEN_PATHS.includes(pathname) ||
      HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (lines.length === 0 || isHidden) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 450, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [lines.length, pulse, pathname]);

  if (
    lines.length === 0 ||
    HIDDEN_PATHS.includes(pathname) ||
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + space.md, transform: [{ scale: pulse }] }]}
      pointerEvents="box-none">
      <Pressable
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`السلة، ${count} منتجات`}
        onPress={() =>
          router.push({
            pathname: "/checkout",
            params: { subtotal: String(subtotal), count: String(count) },
          })
        }>
        <Ionicons name="cart-outline" size={30} color="#000" />
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{count}</AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: space.lg,
    zIndex: 20,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
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