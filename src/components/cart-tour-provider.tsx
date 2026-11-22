import { usePathname } from "expo-router";
import { useCart } from "@/lib/cart";
import { CartTour, CartTourPosition } from "@/components/cart-tour";

const HIDDEN_PATHS = ["/checkout", "/select-map"];
const HIDDEN_PREFIXES = ["/order/"];

export function CartTourProvider() {
  const pathname = usePathname();
  const showTour = useCart((s) => s.showTour);
  const dismissTour = useCart((s) => s.dismissTour);

  const isHidden = HIDDEN_PATHS.includes(pathname) || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const position: CartTourPosition = "floating";

  if (!showTour || isHidden) return null;

  return <CartTour visible={showTour} onDismiss={dismissTour} position={position} />;
}