import type { Doc, Id } from "@/convex/_generated/dataModel";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./app-text";
import { colors, formatPrice, radius, space } from "@/theme";

export function ZonePicker({
  zones,
  value,
  onChange,
}: {
  zones: Doc<"zones">[] | undefined;
  value: Id<"zones"> | null;
  onChange: (zone: Doc<"zones">) => void;
}) {
  if (zones === undefined) return <ActivityIndicator color={colors.primary} />;
  return (
    <View style={styles.block}>
      <AppText variant="caption" tone="muted">
        منطقة التوصيل
      </AppText>
      <View style={styles.row}>
        {zones.map((z) => {
          const selected = value === z._id;
          return (
            <Pressable
              key={z._id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(z)}
              style={[styles.chip, selected && styles.chipOn]}>
              <AppText variant="caption" tone={selected ? "onPrimary" : "ink"} numberOfLines={1}>
                {z.name} · {formatPrice(z.deliveryFee)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: "100%",
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
});
