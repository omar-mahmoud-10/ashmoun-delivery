import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { FormScreen } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { ZonePicker } from "@/components/zone-picker";
import { findZoneForPoint } from "@/lib/geo";
import { useLocationPicker } from "@/lib/location-picker";
import { returnToOrigin } from "@/lib/navigation";
import { colors, space } from "@/theme";

// Completes a delivery-location pick: the detailed street text and zone.
// Coordinates arrive as params when the user picked a pin on the map first;
// typed-only picks have none. If coords fall inside a zone polygon, that zone
// is required (point-in-polygon).
export default function TypeAddress() {
  const setPicked = useLocationPicker((s) => s.setPicked);
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
    from?: string;
  }>();
  const zones = useQuery(api.zones.list);
  const [address, setAddress] = useState(params.address ?? "");
  const [chosenZoneId, setChosenZoneId] = useState<Id<"zones"> | null>(null);
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;
  const hasCoords = lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng);

  const detectedZone =
    hasCoords && zones ? findZoneForPoint({ lat: lat!, lng: lng! }, zones) : undefined;
  const zoneFromPin = hasCoords ? !!detectedZone : false;

  // The detected zone (point-in-polygon) wins over a manual choice only until
  // the user picks one; resolution below prefers chosenZoneId when set.
  const zone = zones?.find((z) => z._id === (chosenZoneId ?? detectedZone?._id)) ?? zones?.[0];
  const outOfZone = hasCoords && zones !== undefined && !detectedZone;

  function confirm() {
    if (!zone || outOfZone) return;
    const street = address.trim();
    if (street.length < 1) return;
    setPicked({
      ...(hasCoords ? { lat, lng } : {}),
      address: street,
      zoneId: zone._id,
      zoneName: zone.name,
      deliveryFee: zone.deliveryFee,
      at: Date.now(),
    });
    returnToOrigin(params.from);
  }

  const ready = !!zone && !outOfZone && address.trim().length >= 1;

  return (
    <FormScreen
      footer={<Button label="تأكيد العنوان" onPress={confirm} disabled={!ready} />}>
      <Stack.Screen options={{ title: "كتابة العنوان", headerTransparent: false }} />
      {hasCoords ? (
        <View style={[styles.mapContext, outOfZone ? styles.mapContextBad : null]}>
          <AppText variant="subtitle" tone={outOfZone ? "danger" : "success"}>
            {outOfZone ? "الموقع خارج مناطق التوصيل" : "📍 تم تحديد موقعك على الخريطة ✓"}
          </AppText>
          <AppText variant="caption" tone="muted">
            {outOfZone
              ? "الموقع الذي اخترته لا يقع داخل أي منطقة توصيل متاحة. ارجع للخريطة واختر موقعًا داخل نطاق التوصيل."
              : detectedZone
                ? `موقعك داخل منطقة: ${detectedZone.name}`
                : "أكمل بكتابة العنوان بالتفصيل"}
          </AppText>
        </View>
      ) : null}
      <TextField
        label="اكتب العنوان بالتفصيل"
        placeholder="مثال: شارع السوق، عمارة 4، الدور الثاني"
        value={address}
        onChangeText={setAddress}
        maxLength={200}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        multiline
      />
      {!outOfZone ? (
        zoneFromPin && detectedZone ? (
          <View style={styles.zoneLocked}>
            <AppText variant="caption" tone="muted">
              منطقة التوصيل (حسب الموقع)
            </AppText>
            <AppText variant="subtitle">{detectedZone.name}</AppText>
          </View>
        ) : (
          <ZonePicker zones={zones} value={zone?._id ?? null} onChange={(z) => setChosenZoneId(z._id)} />
        )
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  mapContext: {
    gap: space.xs,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
  },
  mapContextBad: { backgroundColor: colors.dangerSoft },
  zoneLocked: {
    gap: 2,
    padding: space.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
