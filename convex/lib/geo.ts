export type LatLng = { lat: number; lng: number };

export function pointInPolygon(point: LatLng, polygon: readonly LatLng[]): boolean {
  const { lat: y, lng: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findZoneForPoint<T extends { polygon?: readonly LatLng[] | null }>(
  point: LatLng,
  zones: readonly T[] | undefined,
): T | undefined {
  if (!zones) return undefined;
  return zones.find((z) => z.polygon && z.polygon.length >= 3 && pointInPolygon(point, z.polygon));
}
