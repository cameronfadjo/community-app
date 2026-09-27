import { GeoPoint } from 'firebase/firestore';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Get bounding box coordinates for a radius search
 * Returns min/max lat/lon for the bounding box
 */
export const getBoundingBox = (
  latitude: number,
  longitude: number,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} => {
  const latDelta = radiusKm / 111.32; // 1 degree of latitude ≈ 111.32 km
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(latitude)));

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta,
  };
};

/**
 * Create a GeoPoint from latitude and longitude
 */
export const createGeoPoint = (latitude: number, longitude: number): GeoPoint => {
  return new GeoPoint(latitude, longitude);
};

/**
 * Extract latitude and longitude from GeoPoint
 */
export const geoPointToCoords = (
  geoPoint: GeoPoint
): { latitude: number; longitude: number } => {
  return {
    latitude: geoPoint.latitude,
    longitude: geoPoint.longitude,
  };
};

/**
 * Convert kilometers to miles
 */
export const kmToMiles = (distanceKm: number): number => {
  return distanceKm * 0.621371;
};

/**
 * Format distance for display (in miles)
 */
export const formatDistance = (distanceKm: number): string => {
  const distanceMiles = kmToMiles(distanceKm);

  if (distanceMiles < 0.1) {
    return `${Math.round(distanceMiles * 5280)}ft`; // Show feet for very short distances
  } else if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)}mi`;
  } else {
    return `${Math.round(distanceMiles)}mi`;
  }
};
