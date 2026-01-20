import axios from "axios";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
  GeoJsonProperties,
} from "geojson";
import { CONFIG, COUNTRY_TO_CONTINENT, ADMIN_TYPE_NAMES } from "../config";
import {
  calculateCentroid,
  simplifyGeometry,
  generateScopedSlug,
  delay,
} from "./geo-utils";

const API_BASE_URL = "https://www.geoboundaries.org/api/current";
const RELEASE_TYPE = "gbOpen";

// GeoBoundaries API response type
export interface GeoBoundaryMetadata {
  boundaryID: string;
  boundaryName: string;
  boundaryISO: string;
  boundaryYearRepresented: string;
  boundaryType: string; // "ADM0", "ADM1", "ADM2"
  boundarySource: string;
  boundaryLicense: string;
  gjDownloadURL: string;
  simplifiedGeometryGeoJSON?: string; // Pre-simplified version for visualization
  Continent?: string;
}

// Transformed area ready for Convex
export interface AreaImportData {
  name: string;
  slug: string;
  adminTypeName: string;
  adminLevel: number;
  countryCode: string;
  continentName: string;
  parentGeoboundariesId?: string; // For linking after import
  centroidLat: number;
  centroidLng: number;
  geoboundariesId: string;
  geojson?: string;
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CONFIG.cacheDir, { recursive: true });
}

/**
 * Get cache file path for a boundary
 */
function getCachePath(metadata: GeoBoundaryMetadata, simplified: boolean): string {
  const suffix = simplified ? "_simplified" : "";
  const filename = `${metadata.boundaryISO}-${metadata.boundaryType}-${metadata.boundaryID}${suffix}.geojson`;
  return path.join(CONFIG.cacheDir, filename);
}

/**
 * Fetch boundary metadata from GeoBoundaries API
 */
export async function fetchBoundaryMetadata(
  isoCode: string,
  admLevel: string
): Promise<GeoBoundaryMetadata[] | null> {
  const url = `${API_BASE_URL}/${RELEASE_TYPE}/${isoCode}/${admLevel}`;

  try {
    console.log(`Fetching metadata for ${isoCode} ${admLevel}...`);
    const response = await axios.get<GeoBoundaryMetadata | GeoBoundaryMetadata[]>(url);

    if (!response.data) {
      return null;
    }

    // API sometimes returns single object, sometimes array
    const data = Array.isArray(response.data) ? response.data : [response.data];

    if (data.length === 0) {
      return null;
    }

    console.log(`  Found ${data.length} boundary entries`);
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`  No data available for ${isoCode} ${admLevel}`);
      return null;
    }
    console.error(`Error fetching metadata for ${isoCode} ${admLevel}:`, error);
    return null;
  }
}

/**
 * Download GeoJSON with caching
 * Prefers pre-simplified version from GeoBoundaries for smaller file sizes
 */
async function downloadGeoJson(
  metadata: GeoBoundaryMetadata
): Promise<FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> | null> {
  await ensureCacheDir();

  // Prefer pre-simplified version (smaller, faster, optimized for visualization)
  const useSimplified = !!metadata.simplifiedGeometryGeoJSON;
  const downloadUrl = metadata.simplifiedGeometryGeoJSON || metadata.gjDownloadURL;
  const cachePath = getCachePath(metadata, useSimplified);

  // Check cache first
  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    console.log(`  Using cached: ${cachePath}`);
    return JSON.parse(cached);
  } catch {
    // Cache miss, download
  }

  try {
    console.log(`  Downloading${useSimplified ? " (simplified)" : ""}: ${downloadUrl}`);
    const response = await axios.get<FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>>(
      downloadUrl
    );

    // Save to cache
    await fs.writeFile(cachePath, JSON.stringify(response.data));

    return response.data;
  } catch (error) {
    console.error(`Error downloading GeoJSON:`, error);
    return null;
  }
}

/**
 * Process a single boundary into AreaImportData
 */
function processBoundaryFeature(
  feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>,
  metadata: GeoBoundaryMetadata,
  parentCountryCode?: string
): AreaImportData | null {
  const countryCode = metadata.boundaryISO;
  const adminLevel = parseInt(metadata.boundaryType.replace("ADM", ""), 10);

  // Get name from feature properties or metadata
  const name =
    (feature.properties?.shapeName as string | undefined) ||
    (feature.properties?.shapeGroup as string | undefined) ||
    metadata.boundaryName ||
    "Unknown";

  // Get continent
  const continentName =
    metadata.Continent || COUNTRY_TO_CONTINENT[countryCode] || "Unknown";

  if (continentName === "Unknown") {
    console.warn(`  Unknown continent for country: ${countryCode}`);
  }

  // Generate slug
  const slug = generateScopedSlug(name, countryCode, adminLevel);

  // Get admin type name
  const adminTypeName =
    ADMIN_TYPE_NAMES[adminLevel as keyof typeof ADMIN_TYPE_NAMES] || "Region";

  // Calculate centroid
  const centroid = calculateCentroid(feature);

  // Simplify geometry (always returns a geometry, even if highly simplified)
  const simplified = simplifyGeometry(feature, CONFIG.simplifyTolerance);

  // Generate geoboundariesId
  // For ADM0: just "ISO"
  // For ADM1: use shapeName (matches ADM2's shapeGroup for parent lookup)
  // For ADM2: use shapeID or shapeName
  const featureId =
    adminLevel === 1
      ? (feature.properties?.shapeName as string | undefined) ||
        (feature.properties?.shapeID as string | undefined) ||
        metadata.boundaryID
      : (feature.properties?.shapeID as string | undefined) ||
        (feature.properties?.shapeName as string | undefined) ||
        metadata.boundaryID;
  const geoboundariesId =
    adminLevel === 0
      ? countryCode
      : `${countryCode}-ADM${adminLevel}-${featureId}`;

  // For ADM1/2, store parent reference
  // ADM2's shapeGroup contains the parent ADM1's shapeName
  const parentGeoboundariesId =
    adminLevel === 1
      ? parentCountryCode || countryCode // ADM1 parent is the country
      : adminLevel === 2
        ? `${countryCode}-ADM1-${feature.properties?.shapeGroup || "unknown"}` // ADM2 parent is ADM1
        : undefined;

  return {
    name,
    slug,
    adminTypeName,
    adminLevel,
    countryCode,
    continentName,
    parentGeoboundariesId,
    centroidLat: centroid.lat,
    centroidLng: centroid.lng,
    geoboundariesId,
    geojson: JSON.stringify(simplified.geojson),
  };
}

/**
 * Fetch and process all ADM0 (countries)
 */
export async function fetchAllCountries(): Promise<AreaImportData[]> {
  console.log("\n=== Fetching ADM0 (Countries) ===");

  const metadataList = await fetchBoundaryMetadata("ALL", "ADM0");
  if (!metadataList || metadataList.length === 0) {
    console.error("No ADM0 metadata found");
    return [];
  }

  const results: AreaImportData[] = [];

  for (const metadata of metadataList) {
    await delay(CONFIG.requestDelay);

    const geojson = await downloadGeoJson(metadata);
    if (!geojson || !geojson.features) continue;

    for (const feature of geojson.features) {
      const area = processBoundaryFeature(
        feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>,
        metadata
      );
      if (area) {
        results.push(area);
        console.log(`  Processed: ${area.name} (${area.countryCode})`);
      }
    }
  }

  console.log(`Total countries processed: ${results.length}`);
  return results;
}

/**
 * Fetch and process ADM1 for specified countries
 */
export async function fetchAdm1ForCountries(
  countryCodes: string[]
): Promise<AreaImportData[]> {
  console.log("\n=== Fetching ADM1 (States/Provinces) ===");
  console.log(`Countries: ${countryCodes.join(", ")}`);

  const results: AreaImportData[] = [];

  for (const countryCode of countryCodes) {
    await delay(CONFIG.requestDelay);

    const metadataList = await fetchBoundaryMetadata(countryCode, "ADM1");
    if (!metadataList) continue;

    for (const metadata of metadataList) {
      const geojson = await downloadGeoJson(metadata);
      if (!geojson || !geojson.features) continue;

      for (const feature of geojson.features) {
        const area = processBoundaryFeature(
          feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>,
          metadata,
          countryCode
        );
        if (area) {
          results.push(area);
          console.log(`  Processed: ${area.name} (${area.countryCode})`);
        }
      }
    }
  }

  console.log(`Total ADM1 areas processed: ${results.length}`);
  return results;
}

/**
 * Fetch and process ADM2 for specified countries
 */
export async function fetchAdm2ForCountries(
  countryCodes: string[]
): Promise<AreaImportData[]> {
  console.log("\n=== Fetching ADM2 (Counties/Districts) ===");
  console.log(`Countries: ${countryCodes.join(", ")}`);

  const results: AreaImportData[] = [];

  for (const countryCode of countryCodes) {
    await delay(CONFIG.requestDelay);

    const metadataList = await fetchBoundaryMetadata(countryCode, "ADM2");
    if (!metadataList) continue;

    for (const metadata of metadataList) {
      const geojson = await downloadGeoJson(metadata);
      if (!geojson || !geojson.features) continue;

      for (const feature of geojson.features) {
        const area = processBoundaryFeature(
          feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>,
          metadata,
          countryCode
        );
        if (area) {
          results.push(area);
        }
      }

      console.log(
        `  ${countryCode}: processed ${geojson.features.length} ADM2 areas`
      );
    }
  }

  console.log(`Total ADM2 areas processed: ${results.length}`);
  return results;
}
