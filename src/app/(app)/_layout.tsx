import { useQuery } from "convex/react";
import { Stack, useSegments } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { CartBar } from "@/components/cart-bar";
import { CartTourProvider } from "@/components/cart-tour-provider";
import { stackScreenOptions } from "@/theme";

// Screens opened from a link still get the tabs underneath, so back always leads somewhere.
export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  const me = useQuery(api.users.me);
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  // Tab screens size their own bottom safe area via the tab bar; every other
  // page gets a bottom inset so content never sits under the home indicator.
  const onTabs = (segments as readonly string[]).includes("(tabs)");
  const bottomInset = onTabs ? 0 : insets.bottom;
  return (
    <View style={{ flex: 1, paddingBottom: bottomInset }}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shop/[slug]" options={{ title: "" }} />
        <Stack.Screen name="category/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <Stack.Screen name="category/[slug]" options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <Stack.Screen name="order/[id]/index" options={{ title: "" }} />
        <Stack.Protected guard={me?.isAdmin ?? false}>
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen
          name="product/[id]"
          options={{ presentation: "formSheet", sheetAllowedDetents: [0.9], sheetGrabberVisible: true, title: "" }}
        />
      </Stack>
      <CartBar />
      <CartTourProvider />
    </View>
  );
}
