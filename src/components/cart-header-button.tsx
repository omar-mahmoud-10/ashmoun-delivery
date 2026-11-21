import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { cartCount, useCart } from "@/lib/cart";
import { colors, radius, space } from "@/theme";
import { AppText } from "./app-text";

// The native animated module does not exist on web, where the JS driver is used instead.
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const BUTTON_SIZE = 40;

export function CartHeaderButton() {
  const lines = useCart((s) => s.lines);
  const count = cartCount(lines);
  const empty = count === 0;
  const [pulse] = useState(() => new Animated.Value(1));
  const [pop] = useState(() => new Animated.Value(1));
  const prevCount = useRef(count);

  // Breathe only while the cart has items: an empty cart shows no button at all,
  // so there is nothing to draw attention to.
  useEffect(() => {
    if (empty) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 450, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [empty, pulse]);

  // One-time pop when an item is added: a guidance cue that draws the eye to the
  // cart button the moment an item lands in the cart.
  useEffect(() => {
    if (empty || count <= prevCount.current) {
      prevCount.current = count;
      return;
    }
    prevCount.current = count;
    Animated.timing(pop, { toValue: 1.3, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }).start(() => {
      Animated.timing(pop, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }).start();
    });
  }, [count, empty, pop]);

  return (
    // The slot keeps its exact size on every render: mounting or unmounting the button
    // makes the native header re-measure, which visibly nudges the screen under it.
    // Once an order is placed the cart is empty, and the slot simply goes blank.
    <View style={styles.slot}>
      {empty ? null : (
        <Animated.View style={{ transform: [{ scale: pulse }, { scale: pop }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`السلة، ${count} منتجات`}
            hitSlop={8}
            style={styles.button}
            onPress={() => router.push("/checkout")}>
            <Ionicons name="cart-outline" size={26} color={colors.ink} />
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{count}</AppText>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: BUTTON_SIZE + space.sm * 2,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: -4,
    left: -4,
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
