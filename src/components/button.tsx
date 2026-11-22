import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from "react-native";
import { colors, radius, space } from "@/theme";
import { AppText } from "./app-text";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  kind?: "primary" | "secondary" | "danger" | "outlined" | "bordered";
  loading?: boolean;
};

export function Button({ label, kind = "primary", loading = false, disabled, style, ...props }: Props) {
  const inactive = disabled || loading;
  const textTone = kind === "primary" || kind === "bordered" ? "onPrimary" : kind === "danger" ? "danger" : "primary";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      style={(state) => [
        styles.base,
        styles[kind],
        inactive && styles.inactive,
        state.pressed && styles.pressed,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={kind === "primary" || kind === "bordered" ? colors.onPrimary : colors.primary} />
      ) : (
        <AppText variant="subtitle" tone={textTone} numberOfLines={1}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.dangerSoft },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bordered: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
