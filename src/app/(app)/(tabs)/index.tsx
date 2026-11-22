import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { CategoryArt } from "@/components/category-art";
import { FlashOfferCard } from "@/components/flash-offer-card";
import { OfferBanner } from "@/components/offer-banner";
import { PromoCarousel } from "@/components/promo-carousel";
import { api } from "@/convex/_generated/api";
import { useResponsive } from "@/lib/responsive";
import { fonts, radius, space } from "@/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const ORANGE = "#F26A1B";

const SEARCH_WORDS = ["طعام", "بقالة", "وجبات خفيفة", "المزيد"];

export default function Home() {
  const categories = useQuery(api.catalog.categories);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoProgress] = useState(() => new Animated.Value(0));
  const [placeholder, setPlaceholder] = useState(`ابحث عن ${SEARCH_WORDS[0]}`);
  const { width, isWebPhone } = useResponsive();
  const bannerWidth = Math.min(width, 480) - space.lg * 2 - 24;

  useEffect(() => {
    let wordIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const prefix = "ابحث عن ";
    const TYPING_MS = 55;
    const ERASING_MS = 30;
    // Hold the finished word long enough to read it.
    const READ_PAUSE_MS = 1800;

    const typeNextWord = () => {
      const nextWord = SEARCH_WORDS[wordIndex % SEARCH_WORDS.length];
      wordIndex += 1;
      let charCount = 0;
      setPlaceholder(prefix);
      intervalId = setInterval(() => {
        charCount += 1;
        if (charCount <= nextWord.length) {
          setPlaceholder(prefix + nextWord.slice(0, charCount));
        } else {
          if (intervalId) clearInterval(intervalId);
          timeoutId = setTimeout(eraseCurrentWord, READ_PAUSE_MS);
        }
      }, TYPING_MS);
    };

    const eraseCurrentWord = () => {
      const currentWord = SEARCH_WORDS[(wordIndex - 1 + SEARCH_WORDS.length) % SEARCH_WORDS.length];
      let text = currentWord;
      intervalId = setInterval(() => {
        if (text.length === 0) {
          if (intervalId) clearInterval(intervalId);
          // Back-to-back: the next word starts typing the moment the old one is gone.
          typeNextWord();
        } else {
          text = text.slice(0, -1);
          setPlaceholder(prefix + text);
        }
      }, ERASING_MS);
    };

    timeoutId = setTimeout(typeNextWord, 1200);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // The free-delivery ticker opens a sheet that grows out of it, upwards.
  const openPromo = useCallback(() => {
    setPromoOpen(true);
    Animated.timing(promoProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [promoProgress]);

  const closePromo = useCallback(() => {
    Animated.timing(promoProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPromoOpen(false);
    });
  }, [promoProgress]);

  // Android back closes the sheet instead of leaving the screen.
  useEffect(() => {
    if (!promoOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closePromo();
      return true;
    });
    return () => sub.remove();
  }, [promoOpen, closePromo]);

  // Categories come straight from the catalog, so the row always matches the DB (and its order).
  const sections = categories ?? [];

  return (
    <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.list, Platform.OS === "web" && styles.listWeb]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isWebPhone}>
        {/* Full-bleed orange header with search and the wavy bottom edge */}
        <View style={styles.orangeHeader}>
          <View
            style={[
              styles.search,
              searchFocused && styles.searchFocused,
              isWebPhone ? styles.searchWebPhone : { marginTop: insets.top + space.sm },
            ]}>
            <Ionicons name="search" size={20} color="#333" />
            <TextInput
              accessibilityLabel="ابحث عن الطعام"
              placeholder={placeholder}
              placeholderTextColor="#1a1a1a"
              returnKeyType="search"
              clearButtonMode="while-editing"
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={[styles.searchInput, webNoOutline]}
            />
          </View>
          {/* Wave separator: the header ends in a smooth white wave that leads into the page. */}
          <View pointerEvents="none" style={styles.svgWaveWrapper}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 375 40"
              preserveAspectRatio="none"
              style={styles.svgWave}
            >
              <Path
                d="M 0 18 C 20.8 6, 41.7 6, 62.5 18 C 83.3 30, 104.2 30, 125 18 C 145.8 6, 166.7 6, 187.5 18 C 208.3 30, 229.2 30, 250 18 C 270.8 6, 291.7 6, 312.5 18 C 333.3 30, 354.2 30, 375 18 L 375 40 L 0 40 Z"
                fill="#fff"
              />
            </Svg>
          </View>
        </View>

        {/* Order sections — every category in the DB, read right-to-left in its stored order. */}
        {sections.length > 0 ? (
          <View style={styles.quickLinks}>
            {sections.map((c) => (
              <Pressable
                key={c._id}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                style={styles.quickLink}
                onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug ?? c._id } })}>
                <View style={styles.quickLinkTile}>
                  <CategoryArt name={c.name} emoji={c.emoji} size={40} />
                  <AppText style={styles.quickLinkLabel} numberOfLines={1}>
                    {c.name}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Promo banners: one card at a time, each sliding off to the right as the next arrives. */}
        <View style={styles.bannerWrap}>
          <PromoCarousel width={bannerWidth}>
            <FlashOfferCard width={bannerWidth} />
            <OfferBanner
              width={bannerWidth}
              background="#1B7F4B"
              artBackground="#E8F5EC"
              emoji="🛒"
              kicker="سوق البقالة"
              headline="خصم 20%"
              note="على أول طلب بقالة"
            />
            <OfferBanner
              width={bannerWidth}
              background="#0F5E9C"
              artBackground="#E6F2FA"
              emoji="💊"
              kicker="الصيدلية"
              headline="توصيل 30 دقيقة"
              note="أدوية ومستلزمات طبية"
            />
            <OfferBanner
              width={bannerWidth}
              background="#C2185B"
              artBackground="#FCE8F1"
              emoji="💐"
              kicker="الورود"
              headline="خصم 25%"
              note="على كل بوكيهات الورد"
            />
            <View style={[styles.banner, styles.bannerBlack, { width: bannerWidth }]}>
              <View style={styles.bfBody}>
                <AppText style={styles.bfGifts}>🎁 🛍️</AppText>
                <View style={styles.bfRibbon}>
                  <AppText style={styles.bfRibbonText}>BLACK FRIDAY</AppText>
                </View>
                <AppText style={styles.bfText}>خصومات تخطف العرض</AppText>
              </View>
            </View>
            <View style={[styles.banner, styles.bannerWelcome, { width: bannerWidth }]}>
              <View style={styles.welcomeBody}>
                <AppText style={styles.welcomeEmoji}>🛵</AppText>
                <View style={styles.welcomeTextBlock}>
                  <AppText style={styles.welcomeTitle}>مرحبًا بك في أشمون</AppText>
                  <AppText style={styles.welcomeText}>توصيل مجاني لطلبك الأول</AppText>
                </View>
              </View>
            </View>
          </PromoCarousel>
        </View>
      </ScrollView>

      {/* Pinned free-delivery ticker glued above the tab bar footer. Tapping it grows the promo sheet upwards. */}
      <Pressable
        style={styles.ticker}
        accessibilityRole="button"
        accessibilityState={{ expanded: promoOpen }}
        onPress={promoOpen ? closePromo : openPromo}>
        <View style={styles.tickerContent}>
          <View style={styles.tickerChip}>
            <AppText style={styles.tickerChipText}>توصيل مجاني</AppText>
          </View>
          <View style={styles.tickerMessage}>
            <AppText style={styles.tickerText} numberOfLines={2}>
              لأول طلب داخل مركز بركة السبع
            </AppText>
            <Ionicons
              name={promoOpen ? "chevron-down" : "chevron-up"}
              size={18}
              color="#fff"
            />
          </View>
        </View>
      </Pressable>

      {promoOpen ? (
        <View style={styles.promoLayer}>
          <Animated.View
            style={[
              styles.promoScrim,
              { opacity: promoProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) },
            ]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityLabel="إغلاق عرض التوصيل المجاني"
              onPress={closePromo}
            />
          </Animated.View>

          {/* Full-width sheet pinned to the bottom edge, covering the ticker underneath. */}
          <Animated.View
            style={[
              styles.promoSheet,
              {
                opacity: promoProgress,
                transform: [
                  {
                    translateY: promoProgress.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }),
                  },
                ],
              },
            ]}>
            {/* Decorative only: dragging or pressing the handle must not dismiss the sheet. */}
            <View pointerEvents="none" style={styles.promoHandle} />
            <Pressable
              onPress={closePromo}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              hitSlop={10}
              style={styles.promoClose}>
              <Ionicons name="close" size={16} color="#48240C" />
            </Pressable>
            <View style={styles.promoTitleWrap}>
              <AppText style={styles.promoTitle}>توصيل مجاني لأول طلب داخل مركز بركة السبع</AppText>
            </View>
            <Button
              label="اطلب الآن"
              onPress={() => {
                closePromo();
                router.navigate("/categories");
              }}
            />
          </Animated.View>
        </View>
      ) : null}

    </View>
  );
}

const webNoOutline: object = Platform.OS === "web" ? { outlineStyle: "none" } : {};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  list: { paddingBottom: 94 },
  listWeb: { paddingBottom: 78 },
  // Header
  orangeHeader: {
    backgroundColor: ORANGE,
    // Room for the wave band so the content never sits inside it (kept tight on purpose).
    paddingTop: space.xl,
    paddingBottom: 34,
    gap: space.md,
    paddingHorizontal: space.lg,
    overflow: "visible",
  },
  search: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    paddingHorizontal: space.lg,
  },
  searchWebPhone: { marginTop: space.md },
  searchFocused: { borderWidth: 2, borderColor: "#141414" },
  searchInput: { flex: 1, minHeight: 46, fontFamily: fonts.medium, fontSize: 15, color: "#000", textAlign: "right" },
  svgWaveWrapper: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 26,
  },
  svgWave: {
    width: "100%",
    height: "100%",
  },
  // Order sections — quick category shortcuts above the offers.
  // The app is RTL (dir="rtl" / forcesRTL), so a plain "row" already starts at the right edge.
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    rowGap: space.sm,
    marginTop: space.lg,
    marginBottom: space.xs,
    paddingHorizontal: space.lg,
  },
  // Four fixed columns: nothing is wider than the screen, so no sideways scrolling.
  quickLink: { width: "25%", alignItems: "center", paddingHorizontal: 4 },
  quickLinkTile: {
    width: "100%",
    maxWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: "#F7F2EA",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  quickLinkLabel: {
    color: "#48240C",
    fontWeight: "800",
    fontSize: 11.5,
    lineHeight: 15,
    textAlign: "center",
  },
  // Banner carousel: the track is wider than a card so the neighbouring offers peek in at the edges.
  bannerWrap: { marginTop: space.sm, alignItems: "center" },
  banner: {
    borderRadius: radius.lg,
    overflow: "hidden",
    minHeight: 170,
    flexDirection: "row",
    padding: space.md,
  },
  bannerBlack: { backgroundColor: "#141414" },
  bannerWelcome: { backgroundColor: "#FFF3E0" },
  // Black Friday banner
  bfBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  bfGifts: { fontSize: 30, lineHeight: 42, transform: [{ rotate: "-8deg" }] },
  bfRibbon: {
    backgroundColor: ORANGE,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    transform: [{ rotate: "-8deg" }],
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#5A2B0D",
  },
  bfRibbonText: { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 2 },
  bfText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Welcome banner
  welcomeBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, justifyContent: "center" },
  welcomeEmoji: { fontSize: 40, lineHeight: 54 },
  welcomeTextBlock: { gap: 2, alignItems: "flex-start" },
  welcomeTitle: { fontWeight: "800", fontSize: 18 },
  welcomeText: { color: "#5F564F", fontSize: 13 },
  // Sections
  sectionHeader: { paddingHorizontal: space.lg, marginTop: space.md, marginBottom: space.lg },
  useSaveTitle: { fontWeight: "900" },
  // Pinned ticker above the tab bar
  ticker: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    paddingBottom: Platform.OS === "ios" ? 16 : Platform.OS === "web" ? 8 : 12,
  },
  tickerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  tickerMessage: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  tickerChip: { backgroundColor: "#311419", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tickerChipText: { color: "#ffff00", fontWeight: "800", fontSize: 16 },
  tickerText: { color: "#fff", fontWeight: "700", fontSize: 15, lineHeight: 22, flexShrink: 1 },
  tickerSpacer: { flex: 1 },
  // Free-delivery sheet that grows out of the ticker
  promoLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  promoScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#141414" },
  promoSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: 14,
    paddingBottom: space.xl,
    gap: space.sm,
    shadowColor: "#141414",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  promoHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E3DED8", alignSelf: "center" },
  promoClose: {
    position: "absolute",
    top: 8,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D9CFC3",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  promoTitleWrap: {
    alignSelf: "flex-start",
    marginTop: space.lg,
    backgroundColor: "#311419",
    borderRadius: 12,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.xs,
  },
  promoTitle: { color: "#ffff00", fontWeight: "900", fontSize: 19, lineHeight: 28 },
  promoBody: { color: "#5F564F", fontSize: 14, lineHeight: 22, marginBottom: space.xs },
});
