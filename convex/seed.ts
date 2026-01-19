import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mock data for seeding the database

const COUNTRIES = [
  // Europe
  { name: "France", slug: "france", countryCode: "FRA", continentName: "Europe", adminTypeName: "Country", centroidLat: 46.2276, centroidLng: 2.2137 },
  { name: "Germany", slug: "germany", countryCode: "DEU", continentName: "Europe", adminTypeName: "Country", centroidLat: 51.1657, centroidLng: 10.4515 },
  { name: "Italy", slug: "italy", countryCode: "ITA", continentName: "Europe", adminTypeName: "Country", centroidLat: 41.8719, centroidLng: 12.5674 },
  { name: "Spain", slug: "spain", countryCode: "ESP", continentName: "Europe", adminTypeName: "Country", centroidLat: 40.4637, centroidLng: -3.7492 },
  { name: "United Kingdom", slug: "united-kingdom", countryCode: "GBR", continentName: "Europe", adminTypeName: "Country", centroidLat: 55.3781, centroidLng: -3.4360 },
  { name: "Poland", slug: "poland", countryCode: "POL", continentName: "Europe", adminTypeName: "Country", centroidLat: 51.9194, centroidLng: 19.1451 },
  { name: "Netherlands", slug: "netherlands", countryCode: "NLD", continentName: "Europe", adminTypeName: "Country", centroidLat: 52.1326, centroidLng: 5.2913 },
  { name: "Belgium", slug: "belgium", countryCode: "BEL", continentName: "Europe", adminTypeName: "Country", centroidLat: 50.5039, centroidLng: 4.4699 },
  { name: "Sweden", slug: "sweden", countryCode: "SWE", continentName: "Europe", adminTypeName: "Country", centroidLat: 60.1282, centroidLng: 18.6435 },
  { name: "Portugal", slug: "portugal", countryCode: "PRT", continentName: "Europe", adminTypeName: "Country", centroidLat: 39.3999, centroidLng: -8.2245 },
  // North America
  { name: "United States", slug: "united-states", countryCode: "USA", continentName: "North America", adminTypeName: "Country", centroidLat: 37.0902, centroidLng: -95.7129 },
  { name: "Canada", slug: "canada", countryCode: "CAN", continentName: "North America", adminTypeName: "Country", centroidLat: 56.1304, centroidLng: -106.3468 },
  { name: "Mexico", slug: "mexico", countryCode: "MEX", continentName: "North America", adminTypeName: "Country", centroidLat: 23.6345, centroidLng: -102.5528 },
  // Asia
  { name: "Japan", slug: "japan", countryCode: "JPN", continentName: "Asia", adminTypeName: "Country", centroidLat: 36.2048, centroidLng: 138.2529 },
  { name: "China", slug: "china", countryCode: "CHN", continentName: "Asia", adminTypeName: "Country", centroidLat: 35.8617, centroidLng: 104.1954 },
  { name: "India", slug: "india", countryCode: "IND", continentName: "Asia", adminTypeName: "Country", centroidLat: 20.5937, centroidLng: 78.9629 },
  { name: "Indonesia", slug: "indonesia", countryCode: "IDN", continentName: "Asia", adminTypeName: "Country", centroidLat: -0.7893, centroidLng: 113.9213 },
  { name: "South Korea", slug: "south-korea", countryCode: "KOR", continentName: "Asia", adminTypeName: "Country", centroidLat: 35.9078, centroidLng: 127.7669 },
  // South America
  { name: "Brazil", slug: "brazil", countryCode: "BRA", continentName: "South America", adminTypeName: "Country", centroidLat: -14.2350, centroidLng: -51.9253 },
  { name: "Argentina", slug: "argentina", countryCode: "ARG", continentName: "South America", adminTypeName: "Country", centroidLat: -38.4161, centroidLng: -63.6167 },
  // Africa
  { name: "South Africa", slug: "south-africa", countryCode: "ZAF", continentName: "Africa", adminTypeName: "Country", centroidLat: -30.5595, centroidLng: 22.9375 },
  { name: "Egypt", slug: "egypt", countryCode: "EGY", continentName: "Africa", adminTypeName: "Country", centroidLat: 26.8206, centroidLng: 30.8025 },
  { name: "Nigeria", slug: "nigeria", countryCode: "NGA", continentName: "Africa", adminTypeName: "Country", centroidLat: 9.0820, centroidLng: 8.6753 },
  // Oceania
  { name: "Australia", slug: "australia", countryCode: "AUS", continentName: "Oceania", adminTypeName: "Country", centroidLat: -25.2744, centroidLng: 133.7751 },
  { name: "New Zealand", slug: "new-zealand", countryCode: "NZL", continentName: "Oceania", adminTypeName: "Country", centroidLat: -40.9006, centroidLng: 174.8860 },
];

// States/Provinces for select countries
const STATES: { countryCode: string; states: Array<{ name: string; slug: string; adminTypeName: string; centroidLat: number; centroidLng: number }> }[] = [
  {
    countryCode: "USA",
    states: [
      { name: "California", slug: "california", adminTypeName: "State", centroidLat: 36.7783, centroidLng: -119.4179 },
      { name: "Texas", slug: "texas", adminTypeName: "State", centroidLat: 31.9686, centroidLng: -99.9018 },
      { name: "New York", slug: "new-york", adminTypeName: "State", centroidLat: 42.1657, centroidLng: -74.9481 },
      { name: "Florida", slug: "florida", adminTypeName: "State", centroidLat: 27.6648, centroidLng: -81.5158 },
      { name: "Illinois", slug: "illinois", adminTypeName: "State", centroidLat: 40.6331, centroidLng: -89.3985 },
      { name: "Pennsylvania", slug: "pennsylvania", adminTypeName: "State", centroidLat: 41.2033, centroidLng: -77.1945 },
      { name: "Ohio", slug: "ohio", adminTypeName: "State", centroidLat: 40.4173, centroidLng: -82.9071 },
      { name: "Georgia", slug: "georgia-us", adminTypeName: "State", centroidLat: 32.1656, centroidLng: -82.9001 },
      { name: "North Carolina", slug: "north-carolina", adminTypeName: "State", centroidLat: 35.7596, centroidLng: -79.0193 },
      { name: "Michigan", slug: "michigan", adminTypeName: "State", centroidLat: 44.3148, centroidLng: -85.6024 },
    ],
  },
  {
    countryCode: "FRA",
    states: [
      { name: "Île-de-France", slug: "ile-de-france", adminTypeName: "Région", centroidLat: 48.8499, centroidLng: 2.6370 },
      { name: "Provence-Alpes-Côte d'Azur", slug: "provence-alpes-cote-dazur", adminTypeName: "Région", centroidLat: 43.9352, centroidLng: 6.0679 },
      { name: "Auvergne-Rhône-Alpes", slug: "auvergne-rhone-alpes", adminTypeName: "Région", centroidLat: 45.4473, centroidLng: 4.3852 },
      { name: "Nouvelle-Aquitaine", slug: "nouvelle-aquitaine", adminTypeName: "Région", centroidLat: 45.7087, centroidLng: 0.6261 },
      { name: "Occitanie", slug: "occitanie", adminTypeName: "Région", centroidLat: 43.8927, centroidLng: 2.2827 },
    ],
  },
  {
    countryCode: "DEU",
    states: [
      { name: "Bavaria", slug: "bavaria", adminTypeName: "Bundesland", centroidLat: 48.7904, centroidLng: 11.4979 },
      { name: "North Rhine-Westphalia", slug: "north-rhine-westphalia", adminTypeName: "Bundesland", centroidLat: 51.4332, centroidLng: 7.6616 },
      { name: "Baden-Württemberg", slug: "baden-wurttemberg", adminTypeName: "Bundesland", centroidLat: 48.6616, centroidLng: 9.3501 },
      { name: "Lower Saxony", slug: "lower-saxony", adminTypeName: "Bundesland", centroidLat: 52.6367, centroidLng: 9.8451 },
      { name: "Hesse", slug: "hesse", adminTypeName: "Bundesland", centroidLat: 50.6521, centroidLng: 9.1624 },
    ],
  },
];

// Cities and capitals
const PLACES = [
  // European capitals
  { name: "Paris", latitude: 48.8566, longitude: 2.3522, countryCode: "FRA", continentName: "Europe", featureType: "capital", population: 2161000 },
  { name: "Berlin", latitude: 52.5200, longitude: 13.4050, countryCode: "DEU", continentName: "Europe", featureType: "capital", population: 3645000 },
  { name: "Rome", latitude: 41.9028, longitude: 12.4964, countryCode: "ITA", continentName: "Europe", featureType: "capital", population: 2873000 },
  { name: "Madrid", latitude: 40.4168, longitude: -3.7038, countryCode: "ESP", continentName: "Europe", featureType: "capital", population: 3223000 },
  { name: "London", latitude: 51.5074, longitude: -0.1278, countryCode: "GBR", continentName: "Europe", featureType: "capital", population: 8982000 },
  { name: "Warsaw", latitude: 52.2297, longitude: 21.0122, countryCode: "POL", continentName: "Europe", featureType: "capital", population: 1790000 },
  { name: "Amsterdam", latitude: 52.3676, longitude: 4.9041, countryCode: "NLD", continentName: "Europe", featureType: "capital", population: 872680 },
  { name: "Brussels", latitude: 50.8503, longitude: 4.3517, countryCode: "BEL", continentName: "Europe", featureType: "capital", population: 1209000 },
  { name: "Stockholm", latitude: 59.3293, longitude: 18.0686, countryCode: "SWE", continentName: "Europe", featureType: "capital", population: 975904 },
  { name: "Lisbon", latitude: 38.7223, longitude: -9.1393, countryCode: "PRT", continentName: "Europe", featureType: "capital", population: 504718 },

  // European cities
  { name: "Barcelona", latitude: 41.3851, longitude: 2.1734, countryCode: "ESP", continentName: "Europe", featureType: "city", population: 1620343 },
  { name: "Milan", latitude: 45.4642, longitude: 9.1900, countryCode: "ITA", continentName: "Europe", featureType: "city", population: 1352000 },
  { name: "Munich", latitude: 48.1351, longitude: 11.5820, countryCode: "DEU", continentName: "Europe", featureType: "city", population: 1472000 },
  { name: "Lyon", latitude: 45.7640, longitude: 4.8357, countryCode: "FRA", continentName: "Europe", featureType: "city", population: 513275 },
  { name: "Marseille", latitude: 43.2965, longitude: 5.3698, countryCode: "FRA", continentName: "Europe", featureType: "city", population: 861635 },
  { name: "Hamburg", latitude: 53.5511, longitude: 9.9937, countryCode: "DEU", continentName: "Europe", featureType: "city", population: 1841000 },
  { name: "Naples", latitude: 40.8518, longitude: 14.2681, countryCode: "ITA", continentName: "Europe", featureType: "city", population: 959470 },
  { name: "Manchester", latitude: 53.4808, longitude: -2.2426, countryCode: "GBR", continentName: "Europe", featureType: "city", population: 547627 },
  { name: "Birmingham", latitude: 52.4862, longitude: -1.8904, countryCode: "GBR", continentName: "Europe", featureType: "city", population: 1141816 },
  { name: "Valencia", latitude: 39.4699, longitude: -0.3763, countryCode: "ESP", continentName: "Europe", featureType: "city", population: 791413 },

  // North American capitals and cities
  { name: "Washington, D.C.", latitude: 38.9072, longitude: -77.0369, countryCode: "USA", continentName: "North America", featureType: "capital", population: 689545 },
  { name: "Ottawa", latitude: 45.4215, longitude: -75.6972, countryCode: "CAN", continentName: "North America", featureType: "capital", population: 994837 },
  { name: "Mexico City", latitude: 19.4326, longitude: -99.1332, countryCode: "MEX", continentName: "North America", featureType: "capital", population: 8918653 },
  { name: "New York City", latitude: 40.7128, longitude: -74.0060, countryCode: "USA", continentName: "North America", featureType: "city", population: 8336817 },
  { name: "Los Angeles", latitude: 34.0522, longitude: -118.2437, countryCode: "USA", continentName: "North America", featureType: "city", population: 3979576 },
  { name: "Chicago", latitude: 41.8781, longitude: -87.6298, countryCode: "USA", continentName: "North America", featureType: "city", population: 2693976 },
  { name: "Houston", latitude: 29.7604, longitude: -95.3698, countryCode: "USA", continentName: "North America", featureType: "city", population: 2320268 },
  { name: "Toronto", latitude: 43.6532, longitude: -79.3832, countryCode: "CAN", continentName: "North America", featureType: "city", population: 2731571 },
  { name: "Vancouver", latitude: 49.2827, longitude: -123.1207, countryCode: "CAN", continentName: "North America", featureType: "city", population: 631486 },
  { name: "Montreal", latitude: 45.5017, longitude: -73.5673, countryCode: "CAN", continentName: "North America", featureType: "city", population: 1762949 },
  { name: "San Francisco", latitude: 37.7749, longitude: -122.4194, countryCode: "USA", continentName: "North America", featureType: "city", population: 873965 },
  { name: "Miami", latitude: 25.7617, longitude: -80.1918, countryCode: "USA", continentName: "North America", featureType: "city", population: 467963 },
  { name: "Philadelphia", latitude: 39.9526, longitude: -75.1652, countryCode: "USA", continentName: "North America", featureType: "city", population: 1584064 },
  { name: "Phoenix", latitude: 33.4484, longitude: -112.0740, countryCode: "USA", continentName: "North America", featureType: "city", population: 1680992 },
  { name: "Dallas", latitude: 32.7767, longitude: -96.7970, countryCode: "USA", continentName: "North America", featureType: "city", population: 1343573 },

  // Asian capitals and cities
  { name: "Tokyo", latitude: 35.6762, longitude: 139.6503, countryCode: "JPN", continentName: "Asia", featureType: "capital", population: 13960000 },
  { name: "Beijing", latitude: 39.9042, longitude: 116.4074, countryCode: "CHN", continentName: "Asia", featureType: "capital", population: 21540000 },
  { name: "New Delhi", latitude: 28.6139, longitude: 77.2090, countryCode: "IND", continentName: "Asia", featureType: "capital", population: 16787941 },
  { name: "Jakarta", latitude: -6.2088, longitude: 106.8456, countryCode: "IDN", continentName: "Asia", featureType: "capital", population: 10562088 },
  { name: "Seoul", latitude: 37.5665, longitude: 126.9780, countryCode: "KOR", continentName: "Asia", featureType: "capital", population: 9776000 },
  { name: "Shanghai", latitude: 31.2304, longitude: 121.4737, countryCode: "CHN", continentName: "Asia", featureType: "city", population: 24280000 },
  { name: "Mumbai", latitude: 19.0760, longitude: 72.8777, countryCode: "IND", continentName: "Asia", featureType: "city", population: 12442373 },
  { name: "Osaka", latitude: 34.6937, longitude: 135.5023, countryCode: "JPN", continentName: "Asia", featureType: "city", population: 2691000 },
  { name: "Bangalore", latitude: 12.9716, longitude: 77.5946, countryCode: "IND", continentName: "Asia", featureType: "city", population: 8443675 },
  { name: "Guangzhou", latitude: 23.1291, longitude: 113.2644, countryCode: "CHN", continentName: "Asia", featureType: "city", population: 14904400 },

  // South American capitals and cities
  { name: "Brasília", latitude: -15.7975, longitude: -47.8919, countryCode: "BRA", continentName: "South America", featureType: "capital", population: 2977216 },
  { name: "Buenos Aires", latitude: -34.6037, longitude: -58.3816, countryCode: "ARG", continentName: "South America", featureType: "capital", population: 2891082 },
  { name: "São Paulo", latitude: -23.5505, longitude: -46.6333, countryCode: "BRA", continentName: "South America", featureType: "city", population: 12325232 },
  { name: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729, countryCode: "BRA", continentName: "South America", featureType: "city", population: 6747815 },

  // African capitals and cities
  { name: "Pretoria", latitude: -25.7479, longitude: 28.2293, countryCode: "ZAF", continentName: "Africa", featureType: "capital", population: 741651 },
  { name: "Cairo", latitude: 30.0444, longitude: 31.2357, countryCode: "EGY", continentName: "Africa", featureType: "capital", population: 9539673 },
  { name: "Abuja", latitude: 9.0579, longitude: 7.4951, countryCode: "NGA", continentName: "Africa", featureType: "capital", population: 3464123 },
  { name: "Johannesburg", latitude: -26.2041, longitude: 28.0473, countryCode: "ZAF", continentName: "Africa", featureType: "city", population: 5635127 },
  { name: "Lagos", latitude: 6.5244, longitude: 3.3792, countryCode: "NGA", continentName: "Africa", featureType: "city", population: 14862000 },
  { name: "Alexandria", latitude: 31.2001, longitude: 29.9187, countryCode: "EGY", continentName: "Africa", featureType: "city", population: 5200000 },

  // Oceanian capitals and cities
  { name: "Canberra", latitude: -35.2809, longitude: 149.1300, countryCode: "AUS", continentName: "Oceania", featureType: "capital", population: 453558 },
  { name: "Wellington", latitude: -41.2866, longitude: 174.7756, countryCode: "NZL", continentName: "Oceania", featureType: "capital", population: 212700 },
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093, countryCode: "AUS", continentName: "Oceania", featureType: "city", population: 5312163 },
  { name: "Melbourne", latitude: -37.8136, longitude: 144.9631, countryCode: "AUS", continentName: "Oceania", featureType: "city", population: 5078193 },
  { name: "Auckland", latitude: -36.8485, longitude: 174.7633, countryCode: "NZL", continentName: "Oceania", featureType: "city", population: 1657200 },
  { name: "Brisbane", latitude: -27.4698, longitude: 153.0251, countryCode: "AUS", continentName: "Oceania", featureType: "city", population: 2514184 },
  { name: "Perth", latitude: -31.9505, longitude: 115.8605, countryCode: "AUS", continentName: "Oceania", featureType: "city", population: 2085973 },
];

// US state capitals (linked to states)
const US_STATE_CAPITALS: { stateName: string; city: { name: string; latitude: number; longitude: number; population: number } }[] = [
  { stateName: "California", city: { name: "Sacramento", latitude: 38.5816, longitude: -121.4944, population: 513624 } },
  { stateName: "Texas", city: { name: "Austin", latitude: 30.2672, longitude: -97.7431, population: 978908 } },
  { stateName: "New York", city: { name: "Albany", latitude: 42.6526, longitude: -73.7562, population: 99224 } },
  { stateName: "Florida", city: { name: "Tallahassee", latitude: 30.4383, longitude: -84.2807, population: 196169 } },
  { stateName: "Illinois", city: { name: "Springfield", latitude: 39.7817, longitude: -89.6501, population: 114230 } },
  { stateName: "Pennsylvania", city: { name: "Harrisburg", latitude: 40.2732, longitude: -76.8867, population: 50099 } },
  { stateName: "Ohio", city: { name: "Columbus", latitude: 39.9612, longitude: -82.9988, population: 905748 } },
  { stateName: "Georgia", city: { name: "Atlanta", latitude: 33.7490, longitude: -84.3880, population: 498715 } },
  { stateName: "North Carolina", city: { name: "Raleigh", latitude: 35.7796, longitude: -78.6382, population: 467665 } },
  { stateName: "Michigan", city: { name: "Lansing", latitude: 42.7325, longitude: -84.5555, population: 118210 } },
];

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingArea = await ctx.db.query("areas").first();
    if (existingArea) {
      throw new Error("Database already has data. Clear it first if you want to reseed.");
    }

    // Track created country IDs for linking states
    const countryIdMap = new Map<string, Id<"areas">>();
    const stateIdMap = new Map<string, Id<"areas">>();

    // 1. Insert countries (adminLevel 0)
    for (const country of COUNTRIES) {
      const id = await ctx.db.insert("areas", {
        ...country,
        adminLevel: 0,
        parentAreaId: undefined,
      });
      countryIdMap.set(country.countryCode, id);
    }

    // 2. Insert states/provinces (adminLevel 1)
    for (const { countryCode, states } of STATES) {
      const countryId = countryIdMap.get(countryCode);
      const country = COUNTRIES.find((c) => c.countryCode === countryCode);
      if (!countryId || !country) continue;

      for (const state of states) {
        const id = await ctx.db.insert("areas", {
          ...state,
          adminLevel: 1,
          countryCode,
          continentName: country.continentName,
          parentAreaId: countryId,
        });
        stateIdMap.set(`${countryCode}:${state.name}`, id);
      }
    }

    // 3. Insert places (cities and capitals)
    for (const place of PLACES) {
      await ctx.db.insert("places", {
        ...place,
        adm1Id: undefined,
        adm2Id: undefined,
      });
    }

    // 4. Insert US state capitals (linked to their states)
    for (const { stateName, city } of US_STATE_CAPITALS) {
      const stateId = stateIdMap.get(`USA:${stateName}`);
      await ctx.db.insert("places", {
        name: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
        countryCode: "USA",
        continentName: "North America",
        featureType: "capital",
        population: city.population,
        adm1Id: stateId,
        adm2Id: undefined,
      });
    }

    return {
      countries: COUNTRIES.length,
      states: STATES.reduce((sum, s) => sum + s.states.length, 0),
      places: PLACES.length + US_STATE_CAPITALS.length,
    };
  },
});

// Helper to clear all data (useful for re-seeding)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const places = await ctx.db.query("places").collect();
    const areas = await ctx.db.query("areas").collect();
    const geometries = await ctx.db.query("geometries").collect();

    for (const place of places) {
      await ctx.db.delete(place._id);
    }
    for (const area of areas) {
      await ctx.db.delete(area._id);
    }
    for (const geometry of geometries) {
      await ctx.db.delete(geometry._id);
    }

    return {
      deletedPlaces: places.length,
      deletedAreas: areas.length,
      deletedGeometries: geometries.length,
    };
  },
});
