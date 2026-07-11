import type { ExploreFilters, Location, UserPosition } from "@/types/location";

export const NEAR_ME_RADIUS_METERS = 30_000;

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceToLocation(
  userPosition: UserPosition,
  location: Location,
): number {
  return haversineMeters(
    userPosition.latitude,
    userPosition.longitude,
    location.latitude,
    location.longitude,
  );
}

export function matchesNearMeFilter(
  location: Location,
  nearMe: boolean,
  userPosition: UserPosition | null,
): boolean {
  if (!nearMe || !userPosition) return true;
  return distanceToLocation(userPosition, location) <= NEAR_ME_RADIUS_METERS;
}

export function normalizeGeoText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function matchesComune(locationComune: string, selectedComune: string): boolean {
  const location = normalizeGeoText(locationComune);
  const selected = normalizeGeoText(selectedComune);

  if (location === selected) return true;
  if (location.startsWith(selected) || selected.startsWith(location)) return true;

  const groups = [
    ["venaria", "venaria reale"],
    ["chieri", "pino torinese"],
  ];

  for (const group of groups) {
    if (group.includes(location) && group.includes(selected)) return true;
    if (group.some((g) => location.includes(g)) && group.includes(selected)) {
      return true;
    }
  }

  return false;
}

export function matchesGeoFilter(
  location: Location,
  filters: ExploreFilters,
): boolean {
  if (location.regione !== "Piemonte") return false;

  if (filters.allPiemonte) return true;

  if (filters.selectedComune) {
    if (!matchesComune(location.comune, filters.selectedComune)) {
      return false;
    }
  }

  if (filters.geoArea && location.geoArea !== filters.geoArea) {
    return false;
  }

  if (filters.district && location.district !== filters.district) {
    return false;
  }

  if (filters.zone && location.zone !== filters.zone) {
    return false;
  }

  if (
    !filters.selectedComune &&
    !filters.geoArea &&
    !filters.district &&
    !filters.zone
  ) {
    return true;
  }

  return true;
}
