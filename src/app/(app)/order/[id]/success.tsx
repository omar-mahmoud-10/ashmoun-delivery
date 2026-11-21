import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Unavailable } from "@/components/unavailable";
import { api } from "@/convex/_generated/api";
import { orderCode } from "@/lib/order-code";
import { colors, formatPrice, radius, space } from "@/theme";
import { useQuery } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useQuery(api.orders.get, { orderId: id });

  if (order === null) return <Unavailable message="هذا الطلب غير موجود" />;

  return (
    <SafeAreaView style={styles.screen} edges={Platform.OS === "web" ? [] : undefined}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.badge}>
        <AppText style={styles.check}>✓</AppText>
      </View>
      <AppText variant="display">سيتم تأكيد الأوردر خلال لحظات</AppText>
      <AppText tone="muted" style={styles.center}>
        {"تم استلام طلبك من " + (order?.shopName ?? "")}
      </AppText>
      {order ? (
        <View style={styles.card}>
          <AppText variant="caption" tone="muted">
            رقم الطلب {orderCode(order._id)}
          </AppText>
          <AppText variant="title" tone="primary">
            {formatPrice(order.total)}
          </AppText>
          <AppText variant="caption" tone="muted">
            ستدفع نقدًا عند الاستلام
          </AppText>
          <AppText variant="caption" tone="muted">
            التوصيل إلى موقع داخل {order.address.zoneName}
          </AppText>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="تتبّع الطلب"
          onPress={() => {
            router.dismissAll();
            router.navigate("/orders");
            router.push({ pathname: "/order/[id]", params: { id } });
          }}
        />
        <Button
          kind="secondary"
          label="العودة للرئيسية"
          onPress={() => {
            router.dismissAll();
            router.navigate("/");
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { fontSize: 48, lineHeight: 64, color: colors.success },
  center: { textAlign: "center" },
  card: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: { alignSelf: "stretch", gap: space.sm },
});
