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

export function CartBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const lines = useCart((s) => s.lines);
  const showTour = useCart((s) => s.showTour);
  const [pulse] = useState(() => new Animated.Value(1));

  // While the tour is showing, the cart icon extends then returns to its usual
  // size in sync with the highlight ring, drawing the eye to the cart.
  useEffect(() => {
    if (!showTour) {
      pulse.setValue(1);
      return;
    }
    const useNativeDriver = Platform.OS !== "web";
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showTour, pulse]);

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
    <View style={[styles.wrap, { top: insets.top + space.md }]} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
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
    </View>
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