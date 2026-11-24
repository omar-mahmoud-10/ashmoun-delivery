export type LatLng = { lat: number; lng: number };

// Ray-casting point-in-polygon. `polygon` is an ordered ring of vertices.
// Uses a more robust implementation handling edge cases and vertical segments.
export function pointInPolygon(point: LatLng, polygon: readonly LatLng[]): boolean {
  const { lat: y, lng: x } = point;
  let inside = false;
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    // Check if point is on vertex
    if ((xi === x && yi === y) || (xj === x && yj === y)) return true;
    // Check if point is on edge (including vertical edges)
    const onEdge = yi === yj
      ? y === yi && x >= Math.min(xi, xj) && x <= Math.max(xi, xj)
      : xi === xj
      ? x === xi && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)
      : false;
    if (onEdge) return true;
    // Standard ray-casting intersection test
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
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
