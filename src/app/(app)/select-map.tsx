import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ExpoLocation from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
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
import { MIN_SEARCH_LENGTH, searchPlaces, type PlaceResult } from "@/lib/place-search";
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
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mounted = useRef(false);
  const seq = useRef(0);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

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
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
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
    resetSuggestions();
    setCenter(next);
    setMapSelected(true);
    lookupPlace(next);
  }

  function cancelSuggestTimer() {
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
      suggestTimer.current = null;
    }
  }

  // Drops the open suggestion list and ignores any response still in flight.
  function resetSuggestions() {
    cancelSuggestTimer();
    searchSeq.current++;
    setResults([]);
    setNoResults(false);
    setSearching(false);
  }

  function choosePlace(place: PlaceResult) {
    cancelSuggestTimer();
    searchSeq.current++;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    // Keep the chosen name instead of letting an older reverse lookup overwrite it.
    seq.current++;
    setGeocoding(false);
    setSearching(false);
    setResults([]);
    setNoResults(false);
    setSearchError(null);
    setQuery(place.primary);
    setPlaceLabel(place.full);
    setCenter({ lat: place.lat, lng: place.lng });
    setMapSelected(true);
    Keyboard.dismiss();
  }

  async function runSearch(raw: string, autoPick: boolean) {
    const q = raw.trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      if (!autoPick) return;
      resetSuggestions();
      setSearchError(`اكتب ${MIN_SEARCH_LENGTH} أحرف على الأقل للبحث`);
      return;
    }
    cancelSuggestTimer();
    const id = ++searchSeq.current;
    setSearching(true);
    setNoResults(false);
    setSearchError(null);
    try {
      const found = await searchPlaces(q);
      if (searchSeq.current !== id) return;
      if (found.length === 0) {
        setResults([]);
        setNoResults(true);
        return;
      }
      if (autoPick && found.length === 1) {
        choosePlace(found[0]);
        return;
      }
      setResults(found);
    } catch {
      if (searchSeq.current !== id) return;
      setResults([]);
      setSearchError("تعذر البحث عن المكان");
    } finally {
      if (searchSeq.current === id) setSearching(false);
    }
  }

  function onChangeQuery(text: string) {
    setQuery(text);
    setSearchError(null);
    resetSuggestions();
    if (text.trim().length < MIN_SEARCH_LENGTH) return;
    suggestTimer.current = setTimeout(() => void runSearch(text, false), 600);
  }

  function search() {
    const q = query.trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      resetSuggestions();
      setSearchError(`اكتب ${MIN_SEARCH_LENGTH} أحرف على الأقل للبحث`);
      return;
    }
    Keyboard.dismiss();
    void runSearch(q, true);
  }

  function clearQuery() {
    resetSuggestions();
    setQuery("");
    setSearchError(null);
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
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="ابحث عن مكان أو عنوان..."
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={search}
              textAlign={Platform.OS === "web" ? "right" : undefined}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مسح البحث"
                onPress={clearQuery}
                hitSlop={8}
                style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.faint} />
              </Pressable>
            ) : null}
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

          {results.length > 0 ? (
            <ScrollView
              style={styles.resultsPanel}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {results.map((place, index) => (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  accessibilityLabel={place.full}
                  onPress={() => choosePlace(place)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    index > 0 && styles.resultDivider,
                    pressed && styles.resultRowPressed,
                  ]}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <View style={styles.resultText}>
                    <AppText variant="body" numberOfLines={1}>
                      {place.primary}
                    </AppText>
                    {place.secondary ? (
                      <AppText variant="caption" tone="muted" numberOfLines={2}>
                        {place.secondary}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {noResults ? (
            <View style={styles.notePill}>
              <AppText variant="caption" tone="muted">
                لا توجد نتائج مطابقة
              </AppText>
            </View>
          ) : null}

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
  clearBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
  resultsPanel: {
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  resultsContent: { paddingVertical: space.xs },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  resultRowPressed: { backgroundColor: colors.primarySoft },
  resultText: { flex: 1, gap: 2 },
  notePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
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
