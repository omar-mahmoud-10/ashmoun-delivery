import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ExpoLocation from "expo-location";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { LocationMap, type MapCenter } from "@/components/location-map";
import { findZoneForPoint } from "@/lib/geo";
import { useLocationPicker } from "@/lib/location-picker";
import { colors, fonts, radius, space } from "@/theme";

const FALLBACK: MapCenter = { lat: 30.635, lng: 31.083 };

// Map-only page: pin chosen here, confirmed on type-address.
// Point-in-polygon validates the pin against delivery zone polygons.
export default function SelectMap() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; address?: string; direct?: string }>();
  const zones = useQuery(api.zones.list);
  const setPicked = useLocationPicker((s) => s.setPicked);
  const initialLat = params.lat ? Number(params.lat) : NaN;
  const initialLng = params.lng ? Number(params.lng) : NaN;
  const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng);
  const [center, setCenter] = useState<MapCenter>(() =>
    hasInitial ? { lat: initialLat, lng: initialLng } : FALLBACK,
  );
  const [mapSelected, setMapSelected] = useState(hasInitial);
  const [placeLabel, setPlaceLabel] = useState<string | null>(params.address ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mounted = useRef(false);
  const seq = useRef(0);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchedZone = mapSelected && zones ? findZoneForPoint(center, zones) : undefined;
  const canContinue = mapSelected && !!matchedZone;

  useEffect(() => {
    if (hasInitial) return;
    if (mounted.current) return;
    mounted.current = true;
    void locateMe(true);
  }, []);

  useEffect(
    () => () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    },
    [],
  );

  async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (Platform.OS === "web") {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&accept-language=ar`,
        { headers: { "Accept-Language": "ar" } },
      );
      const data = (await res.json()) as { display_name?: string };
      return data.display_name ?? null;
    }
    const results = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const a = results[0];
    if (!a) return null;
    return [a.street ?? a.name, a.city ?? a.subregion, a.region].filter(Boolean).join("، ") || null;
  }

  function lookupPlace(next: MapCenter) {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      const id = ++seq.current;
      setGeocoding(true);
      void reverseGeocode(next.lat, next.lng)
        .then((label) => {
          if (seq.current !== id) return;
          setPlaceLabel(label);
        })
        .catch(() => {
          if (seq.current !== id) return;
          setPlaceLabel(null);
        })
        .finally(() => {
          if (seq.current === id) setGeocoding(false);
        });
    }, 600);
  }

  function pickMap(next: MapCenter) {
    setCenter(next);
    setMapSelected(true);
    lookupPlace(next);
  }

  async function locateMe(silent = false) {
    if (!silent) Keyboard.dismiss();
    setLocating(true);
    setSearchError(null);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) setSearchError("اسمح بالوصول للموقع لتحديد مكانك");
        return;
      }
      const { coords } = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      pickMap({ lat: coords.latitude, lng: coords.longitude });
    } catch {
      if (!silent) setSearchError("تعذر تحديد موقعك الحالي");
    } finally {
      setLocating(false);
    }
  }

  async function search() {
    const q = query.trim();
    if (q.length < 2) return;
    Keyboard.dismiss();
    setSearching(true);
    setSearchError(null);
    try {
      if (Platform.OS === "web") {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "ar" } },
        );
        const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
        if (data[0]?.lat && data[0]?.lon) {
          setPlaceLabel(data[0].display_name ?? null);
          seq.current++;
          setCenter({ lat: Number(data[0].lat), lng: Number(data[0].lon) });
          setMapSelected(true);
        } else {
          setSearchError("لم يتم العثور على المكان");
        }
      } else {
        const results = await ExpoLocation.geocodeAsync(q);
        if (results[0]) {
          pickMap({ lat: results[0].latitude, lng: results[0].longitude });
        } else {
          setSearchError("لم يتم العثور على المكان");
        }
      }
    } catch {
      setSearchError("تعذر البحث عن المكان");
    } finally {
      setSearching(false);
    }
  }

  function confirm() {
    if (!canContinue || !matchedZone) return;
    if (params.direct === "1") {
      setPicked({
        lat: center.lat,
        lng: center.lng,
        ...(placeLabel || params.address ? { address: placeLabel ?? params.address } : {}),
        zoneId: matchedZone._id,
        zoneName: matchedZone.name,
        deliveryFee: matchedZone.deliveryFee,
        at: Date.now(),
      });
      router.back();
      return;
    }
    router.replace({
      pathname: "/type-address",
      params: {
        lat: String(center.lat),
        lng: String(center.lng),
        ...(placeLabel || params.address ? { address: placeLabel ?? params.address! } : {}),
      },
    });
  }

  const statusText = !mapSelected
    ? "حرّك الخريطة لتحديد الموقع"
    : geocoding
      ? "جارٍ تحديد اسم العنوان..."
      : matchedZone
        ? `داخل منطقة التوصيل: ${matchedZone.name} ✓`
        : "الموقع خارج مناطق التوصيل المتاحة";

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "تحديد الموقع", headerTransparent: false }} />

      <View style={styles.mapWrap}>
        <View style={styles.searchWrap} pointerEvents="box-none">
          <View style={styles.searchBar}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن مكان أو عنوان..."
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={search}
              textAlign={Platform.OS === "web" ? "right" : undefined}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بحث"
              onPress={search}
              disabled={searching}
              style={styles.searchBtn}
              hitSlop={8}>
              {searching ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <AppText variant="caption" tone="onPrimary">
                  بحث
                </AppText>
              )}
            </Pressable>
          </View>
          {searchError ? (
            <View style={styles.errorPill}>
              <AppText variant="caption" tone="danger">
                {searchError}
              </AppText>
            </View>
          ) : null}
        </View>

        <LocationMap center={center} onCenterChange={pickMap} />

        <View style={styles.mapStatus} pointerEvents="none">
          <AppText
            variant="caption"
            tone={!mapSelected ? "muted" : matchedZone ? "success" : "danger"}
            numberOfLines={2}>
            {statusText}
          </AppText>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {!canContinue && mapSelected && zones !== undefined ? (
          <AppText variant="caption" tone="danger">
            اختر موقعًا داخل إحدى مناطق التوصيل المتاحة للمتابعة.
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <Button
            kind="secondary"
            label={locating ? "جارٍ تحديد موقعك..." : "موقعي الحالي"}
            loading={locating}
            onPress={() => void locateMe()}
            style={styles.actionBtn}
          />
          <Button label="متابعة" onPress={confirm} disabled={!canContinue} style={styles.actionBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  mapWrap: { flex: 1, position: "relative" },
  searchWrap: {
    position: "absolute",
    top: space.md,
    left: space.lg,
    right: space.lg,
    zIndex: 10,
    gap: space.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingStart: space.md,
    paddingEnd: space.xs,
    minHeight: 52,
    gap: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: space.sm,
  },
  searchBtn: {
    minHeight: 40,
    minWidth: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  errorPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  mapStatus: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.sm,
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.md,
  },
  actions: { flexDirection: "row", gap: space.sm },
  actionBtn: { flex: 1 },
});
