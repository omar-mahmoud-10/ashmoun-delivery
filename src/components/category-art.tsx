import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const IMAGES: Record<string, number> = {
  "الطعام": require("../../assets/images/hamburger.png"),
  مطاعم: require("../../assets/images/hamburger.png"),
  "المطاعم": require("../../assets/images/hamburger.png"),
  "🍔": require("../../assets/images/hamburger.png"),
  "🥪": require("../../assets/images/hamburger.png"),
  البقالة: require("../../assets/images/grocery.png"),
  بقالة: require("../../assets/images/grocery.png"),
  groceries: require("../../assets/images/grocery.png"),
  "🛍️": require("../../assets/images/grocery.png"),
  "🛒": require("../../assets/images/grocery.png"),
  "الخضروات والفاكهة": require("../../assets/images/fruits.png"),
  "خضروات وفاكهة": require("../../assets/images/fruits.png"),
  "خضار وفاكهة": require("../../assets/images/fruits.png"),
  "الخضار والفاكهة": require("../../assets/images/fruits.png"),
  "الفاكهة": require("../../assets/images/fruits.png"),
  "الخضروات": require("../../assets/images/fruits.png"),
  فواكه: require("../../assets/images/fruits.png"),
  خضروات: require("../../assets/images/fruits.png"),
  fruits: require("../../assets/images/fruits.png"),
  "🥬": require("../../assets/images/fruits.png"),
  "🍎": require("../../assets/images/fruits.png"),
  "🥦": require("../../assets/images/fruits.png"),
  "🍇": require("../../assets/images/fruits.png"),
  المخبوزات: require("../../assets/images/bakery.png"),
  مخبوزات: require("../../assets/images/bakery.png"),
  مخبز: require("../../assets/images/bakery.png"),
  bakery: require("../../assets/images/bakery.png"),
  "🍞": require("../../assets/images/bakery.png"),
  "🥐": require("../../assets/images/bakery.png"),
  حلويات: require("../../assets/images/sweets.png"),
  "الحلويات": require("../../assets/images/sweets.png"),
  sweets: require("../../assets/images/sweets.png"),
  "🍰": require("../../assets/images/sweets.png"),
  "🧁": require("../../assets/images/sweets.png"),
  "كافيه": require("../../assets/images/cafe.png"),
  "الكافيه": require("../../assets/images/cafe.png"),
  "كافيهات": require("../../assets/images/cafe.png"),
  "الكافيهات": require("../../assets/images/cafe.png"),
  "قهوة": require("../../assets/images/cafe.png"),
  cafe: require("../../assets/images/cafe.png"),
  "☕": require("../../assets/images/cafe.png"),
  الصيدليات: require("../../assets/images/pharmacy.png"),
  صيدليات: require("../../assets/images/pharmacy.png"),
  صيدلية: require("../../assets/images/pharmacy.png"),
  pharmacies: require("../../assets/images/pharmacy.png"),
  pharmacy: require("../../assets/images/pharmacy.png"),
  "💊": require("../../assets/images/pharmacy.png"),
  الورود: require("../../assets/images/flowers.png"),
  زهور: require("../../assets/images/flowers.png"),
  flowers: require("../../assets/images/flowers.png"),
  "💐": require("../../assets/images/flowers.png"),
};

export function CategoryArt({
  emoji,
  name,
  size = 64,
}: {
  emoji?: string;
  name?: string;
  size?: number;
}) {
  const source = (name && IMAGES[name]) || (emoji && IMAGES[emoji]);
  // The burger/sandwich and grocery art read small next to the other icons, so
  // draw them larger (same boost) to keep them visually consistent.
  const isBurger = source === IMAGES["الطعام"];
  const isGrocery = source === IMAGES["البقالة"];
  const artSize = isBurger || isGrocery ? size * 1.25 : size;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {source ? (
        <Image source={source} style={{ width: artSize, height: artSize }} contentFit="contain" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});


