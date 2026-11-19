import { router, type Href } from "expo-router";

// Location picking runs through a hub page (select-location), so a confirmed
// pick has to skip back over it and land on the screen that started the flow —
// home, checkout, profile... `from` is the href that screen passed down.
// Falls back to a plain back press when no origin was recorded.
export function returnToOrigin(from: string | string[] | undefined) {
  const target = Array.isArray(from) ? from[0] : from;
  if (target) router.dismissTo(target as Href);
  else router.back();
}
