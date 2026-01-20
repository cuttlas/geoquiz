/**
 * Import areas from GeoBoundaries into Convex
 *
 * Usage: npm run import:areas
 *
 * This script:
 * 1. Fetches ADM0 (countries) from GeoBoundaries
 * 2. Fetches ADM1 (states/provinces) for configured countries
 * 3. Fetches ADM2 (counties/districts) for configured countries
 * 4. Imports all data into Convex with proper parent references
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { CONFIG } from "./config";
import {
  fetchAllCountries,
  fetchAdm1ForCountries,
  fetchAdm2ForCountries,
  type AreaImportData,
} from "./lib/geoboundaries";
import { batch } from "./lib/geo-utils";

// Load .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

// Initialize Convex client
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL or VITE_CONVEX_URL environment variable is required");
  console.error("Set it in .env.local or export it before running");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// Store mapping of geoboundariesId -> Convex ID for parent lookups
const idMapping = new Map<string, Id<"areas">>();

/**
 * Import a batch of areas into Convex
 * If geometry is too large, retries without geometry so the area still exists
 */
async function importAreaBatch(
  areas: AreaImportData[],
  resolveParentId: (geoboundariesId: string | undefined) => Id<"areas"> | undefined
): Promise<void> {
  for (const area of areas) {
    const parentAreaId = resolveParentId(area.parentGeoboundariesId);

    try {
      const id = await client.mutation(api.import.upsertArea, {
        area: {
          name: area.name,
          slug: area.slug,
          adminTypeName: area.adminTypeName,
          adminLevel: area.adminLevel,
          countryCode: area.countryCode,
          continentName: area.continentName,
          parentAreaId,
          centroidLat: area.centroidLat,
          centroidLng: area.centroidLng,
          geoboundariesId: area.geoboundariesId,
          geojson: area.geojson,
        },
      });

      // Store mapping for child lookups
      idMapping.set(area.geoboundariesId, id);
    } catch (error) {
      // If geometry too large, retry without geometry
      const errorMessage = String(error);
      if (errorMessage.includes("too large") && area.geojson) {
        console.warn(`  ${area.name}: geometry too large, importing without polygon`);
        try {
          const id = await client.mutation(api.import.upsertArea, {
            area: {
              name: area.name,
              slug: area.slug,
              adminTypeName: area.adminTypeName,
              adminLevel: area.adminLevel,
              countryCode: area.countryCode,
              continentName: area.continentName,
              parentAreaId,
              centroidLat: area.centroidLat,
              centroidLng: area.centroidLng,
              geoboundariesId: area.geoboundariesId,
              // No geojson - import without geometry
            },
          });
          idMapping.set(area.geoboundariesId, id);
        } catch (retryError) {
          console.error(`Error importing area ${area.name} (retry):`, retryError);
        }
      } else {
        console.error(`Error importing area ${area.name}:`, error);
      }
    }
  }
}

/**
 * Main import function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("GeoQuiz Areas Import");
  console.log("=".repeat(60));
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`ADM1 countries: ${CONFIG.adm1Countries.join(", ")}`);
  console.log(`ADM2 countries: ${CONFIG.adm2Countries.join(", ")}`);
  console.log("");

  const startTime = Date.now();

  try {
    // Step 1: Fetch and import ADM0 (countries)
    const countries = await fetchAllCountries();
    console.log(`\nImporting ${countries.length} countries...`);

    const countryBatches = batch(countries, CONFIG.batchSize);
    for (let i = 0; i < countryBatches.length; i++) {
      console.log(
        `  Batch ${i + 1}/${countryBatches.length} (${countryBatches[i].length} areas)`
      );
      await importAreaBatch(countryBatches[i], () => undefined); // Countries have no parent
    }

    console.log(`Imported ${countries.length} countries`);

    // Step 2: Fetch and import ADM1 (states/provinces)
    const adm1Areas = await fetchAdm1ForCountries(CONFIG.adm1Countries);
    console.log(`\nImporting ${adm1Areas.length} ADM1 areas...`);

    const adm1Batches = batch(adm1Areas, CONFIG.batchSize);
    for (let i = 0; i < adm1Batches.length; i++) {
      console.log(
        `  Batch ${i + 1}/${adm1Batches.length} (${adm1Batches[i].length} areas)`
      );
      await importAreaBatch(adm1Batches[i], (parentId) =>
        parentId ? idMapping.get(parentId) : undefined
      );
    }

    console.log(`Imported ${adm1Areas.length} ADM1 areas`);

    // Step 3: Fetch and import ADM2 (counties/districts)
    if (CONFIG.adm2Countries.length > 0) {
      const adm2Areas = await fetchAdm2ForCountries(CONFIG.adm2Countries);
      console.log(`\nImporting ${adm2Areas.length} ADM2 areas...`);

      const adm2Batches = batch(adm2Areas, CONFIG.batchSize);
      for (let i = 0; i < adm2Batches.length; i++) {
        console.log(
          `  Batch ${i + 1}/${adm2Batches.length} (${adm2Batches[i].length} areas)`
        );
        await importAreaBatch(adm2Batches[i], (parentId) =>
          parentId ? idMapping.get(parentId) : undefined
        );
      }

      console.log(`Imported ${adm2Areas.length} ADM2 areas`);
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("Import Complete!");
    console.log("=".repeat(60));
    console.log(`Total areas imported: ${idMapping.size}`);
    console.log(`  Countries (ADM0): ${countries.length}`);
    console.log(`  States/Provinces (ADM1): ${adm1Areas.length}`);
    if (CONFIG.adm2Countries.length > 0) {
      const adm2Count = idMapping.size - countries.length - adm1Areas.length;
      console.log(`  Counties/Districts (ADM2): ${adm2Count}`);
    }
    console.log(`Time elapsed: ${elapsed}s`);
  } catch (error) {
    console.error("\nImport failed:", error);
    process.exit(1);
  }
}

main();
