import axios from "axios";
import getCountryISO3 from "country-iso-2-to-3";
import { CONFIG, COUNTRY_TO_CONTINENT, CONTINENTS, type ContinentName } from "../config";
import { parseWktPoint, delay } from "./geo-utils";

const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "GeoQuiz-Import/1.0 (https://geoquiz.ai)";

// SPARQL result types
interface SparqlBinding {
  [key: string]: {
    type: "uri" | "literal" | "typed-literal" | "bnode";
    value: string;
    datatype?: string;
    "xml:lang"?: string;
  };
}

interface SparqlResult {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

// Transformed place ready for Convex
export interface PlaceImportData {
  name: string;
  latitude: number;
  longitude: number;
  continentName: string;
  countryCode: string;
  featureType: string;
  population?: number;
  imageUrl?: string;
  wikipediaUrl?: string;
  wikidataId: string;
}

/**
 * Convert alpha-2 country code to alpha-3
 */
function toAlpha3(alpha2: string): string | null {
  try {
    const alpha3 = getCountryISO3(alpha2.toUpperCase());
    return alpha3 || null;
  } catch {
    return null;
  }
}

/**
 * Get Commons image URL from filename
 */
function getCommonsUrl(filename: string): string {
  const formattedName = encodeURIComponent(filename.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${formattedName}`;
}

/**
 * Get Wikipedia URL from article title
 */
function getWikipediaUrl(title: string): string {
  const formattedTitle = encodeURIComponent(title.replace(/ /g, "_"));
  return `https://en.wikipedia.org/wiki/${formattedTitle}`;
}

/**
 * Normalize continent name from Wikidata to our canonical list
 */
function normalizeContinentName(wikidataContinentLabel: string | undefined): ContinentName | null {
  if (!wikidataContinentLabel) return null;

  const label = wikidataContinentLabel.toLowerCase();

  // Map Wikidata continent labels to our canonical names
  const mappings: Record<string, ContinentName> = {
    africa: "Africa",
    asia: "Asia",
    europe: "Europe",
    "north america": "North America",
    "south america": "South America",
    oceania: "Oceania",
    australia: "Oceania",
    antarctica: "Antarctica",
    // Handle some variations
    "central america": "North America",
    "caribbean": "North America",
    americas: "North America", // Fallback, not ideal
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (label.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Build SPARQL query for cities with population threshold
 */
function buildCitiesQuery(populationThreshold: number, includeCapitals: boolean): string {
  // Types to include
  const types = includeCapitals
    ? `wd:Q515 wd:Q3957 wd:Q5119 wd:Q1549591` // city, town, capital, big city
    : `wd:Q515 wd:Q3957`; // city, town

  return `
    SELECT DISTINCT
      ?item ?itemLabel
      ?coords ?population
      ?countryCode
      ?continent ?continentLabel
      ?type ?typeLabel
      ?image
      ?article
    WHERE {
      VALUES ?type { ${types} }
      ?item wdt:P31 ?type .
      ?item wdt:P1082 ?population .
      ?item wdt:P625 ?coords .

      FILTER (?population >= ${populationThreshold})

      OPTIONAL {
        ?item wdt:P17 ?country .
        ?country wdt:P297 ?countryCode .
        OPTIONAL { ?country wdt:P30 ?continent . }
      }
      OPTIONAL { ?item wdt:P18 ?image . }
      OPTIONAL {
        ?article schema:about ?item ;
                 schema:isPartOf <https://en.wikipedia.org/> ;
                 schema:inLanguage "en" .
      }

      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
        ?item rdfs:label ?itemLabel .
        ?continent rdfs:label ?continentLabel .
        ?type rdfs:label ?typeLabel .
      }
    }
    ORDER BY DESC(?population)
  `;
}

/**
 * Fetch places from Wikidata SPARQL endpoint
 */
export async function fetchPlaces(): Promise<PlaceImportData[]> {
  console.log("\n=== Fetching Places from Wikidata ===");
  console.log(`Population threshold: ${CONFIG.populationThreshold}`);

  const query = buildCitiesQuery(CONFIG.populationThreshold, CONFIG.autoDetectCapitals);

  try {
    console.log("Executing SPARQL query...");
    const response = await axios.get<SparqlResult>(WIKIDATA_SPARQL_ENDPOINT, {
      params: { query, format: "json" },
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      timeout: 120000, // 2 minute timeout for large queries
    });

    const bindings = response.data.results.bindings;
    console.log(`Received ${bindings.length} results from Wikidata`);

    const results: PlaceImportData[] = [];
    const seenQids = new Set<string>(); // Deduplicate

    for (const binding of bindings) {
      // Extract QID from URI
      const qid = binding.item?.value.split("/").pop();
      if (!qid || seenQids.has(qid)) continue;
      seenQids.add(qid);

      // Parse coordinates
      const coords = parseWktPoint(binding.coords?.value || "");
      if (!coords) {
        console.warn(`  Skipping ${qid}: invalid coordinates`);
        continue;
      }

      // Get country code (alpha-2 to alpha-3)
      const alpha2 = binding.countryCode?.value;
      if (!alpha2) {
        console.warn(`  Skipping ${qid}: no country code`);
        continue;
      }

      const countryCode = toAlpha3(alpha2);
      if (!countryCode) {
        console.warn(`  Skipping ${qid}: could not convert country code ${alpha2}`);
        continue;
      }

      // Get continent
      const wikidataContinent = binding.continentLabel?.value;
      let continentName = normalizeContinentName(wikidataContinent);

      // Fallback to country-based lookup
      if (!continentName) {
        continentName = COUNTRY_TO_CONTINENT[countryCode] || null;
      }

      if (!continentName || !CONTINENTS.includes(continentName)) {
        console.warn(`  Skipping ${qid}: unknown continent for ${countryCode}`);
        continue;
      }

      // Determine feature type
      const typeQid = binding.type?.value.split("/").pop();
      const featureType = typeQid === "Q5119" ? "capital" : "city";

      // Get name
      const name = binding.itemLabel?.value;
      if (!name) {
        console.warn(`  Skipping ${qid}: no name`);
        continue;
      }

      // Parse population
      const population = binding.population?.value
        ? parseInt(binding.population.value, 10)
        : undefined;

      // Get optional fields
      const imageFilename = binding.image?.value?.split("/").pop();
      const imageUrl = imageFilename ? getCommonsUrl(decodeURIComponent(imageFilename)) : undefined;

      const articleUrl = binding.article?.value;
      const articleTitle = articleUrl?.split("/").pop();
      const wikipediaUrl = articleTitle ? getWikipediaUrl(decodeURIComponent(articleTitle)) : undefined;

      results.push({
        name,
        latitude: coords.lat,
        longitude: coords.lon,
        continentName,
        countryCode,
        featureType,
        population,
        imageUrl,
        wikipediaUrl,
        wikidataId: qid,
      });
    }

    console.log(`Processed ${results.length} unique places`);

    // Log some stats
    const capitals = results.filter((p) => p.featureType === "capital").length;
    const cities = results.filter((p) => p.featureType === "city").length;
    console.log(`  Capitals: ${capitals}`);
    console.log(`  Cities: ${cities}`);

    return results;
  } catch (error) {
    console.error("Error fetching from Wikidata:", error);
    throw error;
  }
}

/**
 * Fetch only capitals (regardless of population)
 * Useful for ensuring all capitals are included
 */
export async function fetchCapitals(): Promise<PlaceImportData[]> {
  console.log("\n=== Fetching Capitals from Wikidata ===");

  const query = `
    SELECT DISTINCT
      ?item ?itemLabel
      ?coords ?population
      ?countryCode
      ?continent ?continentLabel
      ?image
      ?article
    WHERE {
      ?item wdt:P31 wd:Q5119 .  # capital city
      ?item wdt:P625 ?coords .

      OPTIONAL { ?item wdt:P1082 ?population . }
      OPTIONAL {
        ?item wdt:P17 ?country .
        ?country wdt:P297 ?countryCode .
        OPTIONAL { ?country wdt:P30 ?continent . }
      }
      OPTIONAL { ?item wdt:P18 ?image . }
      OPTIONAL {
        ?article schema:about ?item ;
                 schema:isPartOf <https://en.wikipedia.org/> ;
                 schema:inLanguage "en" .
      }

      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
        ?item rdfs:label ?itemLabel .
        ?continent rdfs:label ?continentLabel .
      }
    }
  `;

  try {
    console.log("Executing SPARQL query for capitals...");
    const response = await axios.get<SparqlResult>(WIKIDATA_SPARQL_ENDPOINT, {
      params: { query, format: "json" },
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      timeout: 60000,
    });

    const bindings = response.data.results.bindings;
    console.log(`Received ${bindings.length} capital results`);

    const results: PlaceImportData[] = [];
    const seenQids = new Set<string>();

    for (const binding of bindings) {
      const qid = binding.item?.value.split("/").pop();
      if (!qid || seenQids.has(qid)) continue;
      seenQids.add(qid);

      const coords = parseWktPoint(binding.coords?.value || "");
      if (!coords) continue;

      const alpha2 = binding.countryCode?.value;
      if (!alpha2) continue;

      const countryCode = toAlpha3(alpha2);
      if (!countryCode) continue;

      const wikidataContinent = binding.continentLabel?.value;
      let continentName = normalizeContinentName(wikidataContinent);
      if (!continentName) {
        continentName = COUNTRY_TO_CONTINENT[countryCode] || null;
      }
      if (!continentName || !CONTINENTS.includes(continentName)) continue;

      const name = binding.itemLabel?.value;
      if (!name) continue;

      const population = binding.population?.value
        ? parseInt(binding.population.value, 10)
        : undefined;

      const imageFilename = binding.image?.value?.split("/").pop();
      const imageUrl = imageFilename ? getCommonsUrl(decodeURIComponent(imageFilename)) : undefined;

      const articleUrl = binding.article?.value;
      const articleTitle = articleUrl?.split("/").pop();
      const wikipediaUrl = articleTitle ? getWikipediaUrl(decodeURIComponent(articleTitle)) : undefined;

      results.push({
        name,
        latitude: coords.lat,
        longitude: coords.lon,
        continentName,
        countryCode,
        featureType: "capital",
        population,
        imageUrl,
        wikipediaUrl,
        wikidataId: qid,
      });
    }

    console.log(`Processed ${results.length} unique capitals`);
    return results;
  } catch (error) {
    console.error("Error fetching capitals from Wikidata:", error);
    throw error;
  }
}
