import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Cities, capitals, towns
  places: defineTable({
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    // Denormalized for efficient querying at each scope level
    continentName: v.string(),
    countryCode: v.string(), // ISO alpha-3
    adm1Id: v.optional(v.id("areas")), // State/Province reference
    adm2Id: v.optional(v.id("areas")), // County/District reference
    featureType: v.string(), // "city", "capital", "town"
    population: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    wikipediaUrl: v.optional(v.string()),
  })
    .index("by_continent", ["continentName"])
    .index("by_country", ["countryCode"])
    .index("by_adm1", ["adm1Id"])
    .index("by_adm2", ["adm2Id"])
    .index("by_continent_type", ["continentName", "featureType"])
    .index("by_country_type", ["countryCode", "featureType"]),

  // Countries, states, provinces, counties, etc.
  areas: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly ID (e.g., "west-java")
    adminTypeName: v.string(), // "Province", "State", "Kabupaten", etc.
    adminLevel: v.number(), // 0=country, 1=state, 2=county, etc.
    countryCode: v.string(), // ISO alpha-3
    continentName: v.string(),
    parentAreaId: v.optional(v.id("areas")), // For hierarchy traversal
    centroidLat: v.number(),
    centroidLng: v.number(),
    geometryId: v.optional(v.id("geometries")),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentAreaId"])
    .index("by_continent_level", ["continentName", "adminLevel"])
    .index("by_country_level", ["countryCode", "adminLevel"]),

  // GeoJSON geometries (stored separately due to size)
  geometries: defineTable({
    geojson: v.string(),
  }),
});
