import { CatmullRomCurve3, QuadraticBezierCurve3, Vector3 } from 'three';

export const GLOBE_R = 2.2;
export const CORE_POS = new Vector3(0, 1.55, 1.35);
export const ARC_NODES = [0, 2, 4, 6, 9];

// lat: -90 (south) .. +90 (north). long: 0 faces +Z (camera). +long sweeps east.
export const sphericalToCartesian = (r: number, latDeg: number, longDeg: number): Vector3 => {
  const lat = (latDeg * Math.PI) / 180;
  const long = (longDeg * Math.PI) / 180;
  return new Vector3(
    r * Math.cos(lat) * Math.sin(long),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.cos(long),
  );
};

// A Japan-ish archipelago arc: NE (Hokkaido) down to SW (Okinawa), drifting west.
export const NODES: { lat: number; long: number }[] = [
  { lat: 44, long: 26 },
  { lat: 39, long: 20 },
  { lat: 35, long: 15 },
  { lat: 31, long: 9 },
  { lat: 27, long: 2 },
  { lat: 41, long: 33 },
  { lat: 37, long: 11 },
  { lat: 33, long: 4 },
  { lat: 36, long: 24 },
  { lat: 29, long: -4 },
  { lat: 38, long: 28 },
  { lat: 34, long: 19 },
];

export const arcCurve = (from: Vector3): QuadraticBezierCurve3 => {
  const mid = from.clone().add(CORE_POS).multiplyScalar(0.5);
  const lift = mid.clone().normalize().multiplyScalar(1.5);
  const ctrl = mid.add(lift);
  return new QuadraticBezierCurve3(from.clone(), ctrl, CORE_POS.clone());
};

export const partialCurve = (curve: QuadraticBezierCurve3, f: number): CatmullRomCurve3 => {
  const n = 24;
  const pts: Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPoint((i / n) * f));
  return new CatmullRomCurve3(pts);
};
