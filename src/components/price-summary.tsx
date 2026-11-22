import { StyleSheet, View } from "react-native";
import { colors, formatPrice, radius, space } from "@/theme";
import { AppText } from "./app-text";

export function PriceSummary({
  subtotal,
  deliveryFee,
  pickup = false,
}: {
  subtotal: number | undefined;
  deliveryFee: number | undefined;
  pickup?: boolean;
}) {
  const known = subtotal !== undefined && deliveryFee !== undefined;
  const items = [
    { label: "الطلب", value: subtotal === undefined ? "..." : formatPrice(subtotal) },
    {
      label: pickup ? "الاستلام" : "التوصيل",
      value: deliveryFee === undefined ? "..." : pickup ? "مجاني" : formatPrice(deliveryFee),
    },
    { label: "الإجمالي", value: known ? formatPrice(subtotal + deliveryFee) : "...", strong: true },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <AppText variant="caption" tone="muted">
              {item.label}
            </AppText>
            <AppText variant={item.strong ? "subtitle" : "body"} tone={item.strong ? "primary" : "ink"}>
              {item.value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.md },
  item: { flex: 1, alignItems: "center", gap: 2 },
});
