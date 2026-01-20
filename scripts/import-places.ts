/**
 * Import places from Wikidata into Convex
 *
 * Usage: npm run import:places
 *
 * This script:
 * 1. Fetches cities/capitals from Wikidata SPARQL endpoint
 * 2. Performs spatial matching to find containing ADM1/ADM2 areas
 * 3. Imports all data into Convex with area references
 */

import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { CONFIG } from "./config";
import { fetchPlaces, fetchCapitals, type PlaceImportData } from "./lib/wikidata";
import { batch, findContainingArea } from "./lib/geo-utils";

// Load .env.local
config({ path: ".env.local" });

// Initialize Convex client
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL or VITE_CONVEX_URL environment variable is required");
  console.error("Set it in .env.local or export it before running");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Cache for areas (for spatial matching)
interface AreaWithGeometry {
  _id: Id<"areas">;
  countryCode: string;
  adminLevel: number;
  geojson: string | null;
}

const adm1Cache = new Map<string, AreaWithGeometry[]>(); // countryCode -> areas
const adm2Cache = new Map<string, AreaWithGeometry[]>(); // countryCode -> areas

/**
 * Load areas for a country for spatial matching
 */
async function loadAreasForCountry(
  countryCode: string,
  adminLevel: number
): Promise<AreaWithGeometry[]> {
  const cache = adminLevel === 1 ? adm1Cache : adm2Cache;

  if (cache.has(countryCode)) {
    return cache.get(countryCode)!;
  }

  try {
    const areas = await client.query(api.import.getAreasForSpatialMatch, {
      countryCode,
      adminLevel,
    });

    cache.set(countryCode, areas as AreaWithGeometry[]);
    return areas as AreaWithGeometry[];
  } catch (error) {
    console.warn(`Could not load ADM${adminLevel} areas for ${countryCode}:`, error);
    cache.set(countryCode, []);
    return [];
  }
}

/**
 * Find ADM1 and ADM2 IDs for a place using spatial matching
 */
async function findAreaIds(
  place: PlaceImportData
): Promise<{ adm1Id?: Id<"areas">; adm2Id?: Id<"areas"> }> {
  const result: { adm1Id?: Id<"areas">; adm2Id?: Id<"areas"> } = {};

  // Try to find ADM1
  const adm1Areas = await loadAreasForCountry(place.countryCode, 1);
  if (adm1Areas.length > 0) {
    const adm1 = findContainingArea(
      place.latitude,
      place.longitude,
      adm1Areas,
      place.countryCode
    );
    if (adm1) {
      result.adm1Id = adm1._id;
    }
  }

  // Try to find ADM2 (only if country has ADM2 data)
  if (CONFIG.adm2Countries.includes(place.countryCode)) {
    const adm2Areas = await loadAreasForCountry(place.countryCode, 2);
    if (adm2Areas.length > 0) {
      const adm2 = findContainingArea(
        place.latitude,
        place.longitude,
        adm2Areas,
        place.countryCode
      );
      if (adm2) {
        result.adm2Id = adm2._id;
      }
    }
  }

  return result;
}

/**
 * Import a batch of places into Convex
 */
async function importPlaceBatch(places: PlaceImportData[]): Promise<number> {
  let imported = 0;

  for (const place of places) {
    try {
      // Find containing areas
      const { adm1Id, adm2Id } = await findAreaIds(place);

      await client.mutation(api.import.upsertPlace, {
        place: {
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          continentName: place.continentName,
          countryCode: place.countryCode,
          adm1Id,
          adm2Id,
          featureType: place.featureType,
          population: place.population,
          imageUrl: place.imageUrl,
          wikipediaUrl: place.wikipediaUrl,
          wikidataId: place.wikidataId,
        },
      });

      imported++;
    } catch (error) {
      console.error(`Error importing place ${place.name}:`, error);
    }
  }

  return imported;
}

/**
 * Main import function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("GeoQuiz Places Import");
  console.log("=".repeat(60));
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Population threshold: ${CONFIG.populationThreshold.toLocaleString()}`);
  console.log(`Auto-detect capitals: ${CONFIG.autoDetectCapitals}`);
  console.log("");

  const startTime = Date.now();

  try {
    // Step 1: Fetch places from Wikidata
    const places = await fetchPlaces();

    // Step 2: Optionally fetch capitals separately to ensure all are included
    // (capitals might have low or missing population)
    let allPlaces = places;
    if (CONFIG.autoDetectCapitals) {
      const capitals = await fetchCapitals();

      // Merge, preferring the capital data for duplicates
      const placeMap = new Map<string, PlaceImportData>();
      for (const place of places) {
        placeMap.set(place.wikidataId, place);
      }
      for (const capital of capitals) {
        // Only add/update if not already present or to set capital type
        const existing = placeMap.get(capital.wikidataId);
        if (!existing || existing.featureType !== "capital") {
          placeMap.set(capital.wikidataId, capital);
        }
      }
      allPlaces = Array.from(placeMap.values());
      console.log(`\nMerged places: ${allPlaces.length} unique places`);
    }

    // Step 3: Import in batches
    console.log(`\nImporting ${allPlaces.length} places...`);

    const batches = batch(allPlaces, CONFIG.batchSize);
    let totalImported = 0;

    for (let i = 0; i < batches.length; i++) {
      const batchPlaces = batches[i];
      console.log(
        `  Batch ${i + 1}/${batches.length} (${batchPlaces.length} places)`
      );

      const imported = await importPlaceBatch(batchPlaces);
      totalImported += imported;

      // Progress
      const percent = (((i + 1) / batches.length) * 100).toFixed(1);
      console.log(`    Imported: ${imported}, Total: ${totalImported} (${percent}%)`);
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("Import Complete!");
    console.log("=".repeat(60));
    console.log(`Total places imported: ${totalImported}`);

    const capitals = allPlaces.filter((p) => p.featureType === "capital").length;
    const cities = allPlaces.filter((p) => p.featureType === "city").length;
    console.log(`  Capitals: ${capitals}`);
    console.log(`  Cities: ${cities}`);
    console.log(`Time elapsed: ${elapsed}s`);
  } catch (error) {
    console.error("\nImport failed:", error);
    process.exit(1);
  }
}

main();
