import centerOfMass from "@turf/center-of-mass";
import simplify from "@turf/simplify";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import slugifyLib from "slugify";
import type {
  Feature,
  Polygon,
  MultiPolygon,
  GeoJsonProperties,
} from "geojson";

const MAX_GEOMETRY_SIZE = 900 * 1024; // 900KB (leaving room for other document fields)

/**
 * Parse WKT Point format from Wikidata
 * Format: "Point(lon lat)"
 */
export function parseWktPoint(
  wkt: string
): { lat: number; lon: number } | null {
  const match = wkt.match(/^Point\(([^ ]+) ([^ ]+)\)$/i);
  if (!match) return null;

  const lon = parseFloat(match[1]);
  const lat = parseFloat(match[2]);

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    console.warn(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    return null;
  }

  return { lat, lon };
}

/**
 * Calculate centroid of a polygon using center of mass
 * Better than simple centroid for complex/concave shapes
 */
export function calculateCentroid(
  geojson: Feature<Polygon | MultiPolygon, GeoJsonProperties>
): { lat: number; lng: number } {
  const center = centerOfMass(geojson);
  const [lng, lat] = center.geometry.coordinates;
  return { lat, lng };
}

/**
 * Simplify a geometry to reduce size
 * Progressively increases tolerance until under size limit
 * For very complex geometries (like Australia), uses aggressive simplification
 * ALWAYS returns a geometry, even if extremely simplified
 */
export function simplifyGeometry(
  geojson: Feature<Polygon | MultiPolygon, GeoJsonProperties>,
  initialTolerance: number = 0.01
): { geojson: Feature<Polygon | MultiPolygon, GeoJsonProperties>; tolerance: number } {
  let tolerance = initialTolerance;
  let simplified = geojson;
  let attempts = 0;
  const maxAttempts = 50; // Many attempts to ensure we always get under the limit

  while (attempts < maxAttempts) {
    simplified = simplify(geojson, {
      tolerance,
      highQuality: attempts < 10, // Use fast mode for aggressive simplification
    }) as Feature<Polygon | MultiPolygon, GeoJsonProperties>;

    const size = JSON.stringify(simplified).length;

    if (size <= MAX_GEOMETRY_SIZE) {
      if (tolerance > 1) {
        console.warn(`  Used aggressive simplification (tolerance: ${tolerance.toFixed(3)})`);
      }
      return { geojson: simplified, tolerance };
    }

    // Increase tolerance more aggressively after initial attempts
    if (attempts < 5) {
      tolerance *= 2;
    } else if (attempts < 10) {
      tolerance *= 3;
    } else if (attempts < 20) {
      tolerance *= 5;
    } else {
      tolerance *= 10; // Extremely aggressive for very stubborn geometries
    }
    attempts++;
  }

  // If we still haven't fit under the limit after 50 attempts,
  // return the last simplified version anyway (tolerance would be astronomical)
  const finalSize = JSON.stringify(simplified).length;
  console.warn(
    `  Geometry still large after max simplification (${(finalSize / 1024).toFixed(0)}KB), using highly simplified version (tolerance: ${tolerance.toFixed(0)})`
  );
  return { geojson: simplified, tolerance };
}

/**
 * Generate a URL-friendly slug
 */
export function generateSlug(name: string): string {
  return slugifyLib(name, {
    lower: true,
    strict: true, // Remove special characters
    trim: true,
  });
}

/**
 * Generate a scoped slug to avoid collisions
 * - ADM0 (countries): just lowercase country code
 * - ADM1/ADM2: countryCode-slugifiedName
 */
export function generateScopedSlug(
  name: string,
  countryCode: string,
  adminLevel: number
): string {
  if (adminLevel === 0) {
    // Country level - just use lowercase country code
    return countryCode.toLowerCase();
  }

  // State/Province or County level - scope with country code
  const slug = generateSlug(name);
  return `${countryCode.toLowerCase()}-${slug}`;
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(
  lat: number,
  lon: number,
  polygon: Feature<Polygon | MultiPolygon, GeoJsonProperties>
): boolean {
  const pt = point([lon, lat]);
  return booleanPointInPolygon(pt, polygon);
}

/**
 * Find which area contains a point
 * Returns the first matching area's ID
 */
export function findContainingArea<
  T extends {
    _id: string;
    geojson: string | null;
    countryCode: string;
  }
>(lat: number, lon: number, areas: T[], countryCode?: string): T | null {
  // Pre-filter by country if provided
  const candidates = countryCode
    ? areas.filter((a) => a.countryCode === countryCode)
    : areas;

  for (const area of candidates) {
    if (!area.geojson) continue;

    try {
      const polygon = JSON.parse(area.geojson) as Feature<
        Polygon | MultiPolygon,
        GeoJsonProperties
      >;
      if (isPointInPolygon(lat, lon, polygon)) {
        return area;
      }
    } catch (e) {
      console.warn(`Invalid GeoJSON for area ${area._id}:`, e);
    }
  }

  return null;
}

/**
 * Delay execution for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch an array into chunks
 */
export function batch<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}
