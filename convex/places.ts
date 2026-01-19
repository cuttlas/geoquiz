import { query } from "./_generated/server";
import { v } from "convex/values";

// Get places with flexible filtering
// This handles all scope levels: continent, country, adm1, adm2
export const getPlaces = query({
  args: {
    continentName: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    adm1Id: v.optional(v.id("areas")),
    adm2Id: v.optional(v.id("areas")),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Choose the most specific index based on provided filters
    let places;
    const { adm2Id, adm1Id, countryCode, continentName } = args;

    if (adm2Id) {
      // Most specific: filter by ADM2
      places = await ctx.db
        .query("places")
        .withIndex("by_adm2", (q) => q.eq("adm2Id", adm2Id))
        .collect();
    } else if (adm1Id) {
      // Filter by ADM1
      places = await ctx.db
        .query("places")
        .withIndex("by_adm1", (q) => q.eq("adm1Id", adm1Id))
        .collect();
    } else if (countryCode) {
      // Filter by country
      places = await ctx.db
        .query("places")
        .withIndex("by_country", (q) => q.eq("countryCode", countryCode))
        .collect();
    } else if (continentName) {
      // Filter by continent
      places = await ctx.db
        .query("places")
        .withIndex("by_continent", (q) => q.eq("continentName", continentName))
        .collect();
    } else {
      // No filter - get all places (world scope)
      places = await ctx.db.query("places").collect();
    }

    // Apply additional filters in memory
    if (args.featureType) {
      places = places.filter((p) => p.featureType === args.featureType);
    }

    if (args.minPopulation) {
      places = places.filter(
        (p) => p.population && p.population >= args.minPopulation!
      );
    }

    return places;
  },
});

// Count places with flexible filtering (for preview count)
export const countPlaces = query({
  args: {
    continentName: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    adm1Id: v.optional(v.id("areas")),
    adm2Id: v.optional(v.id("areas")),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Reuse the same logic as getPlaces but just count
    let places;
    const { adm2Id, adm1Id, countryCode, continentName } = args;

    if (adm2Id) {
      places = await ctx.db
        .query("places")
        .withIndex("by_adm2", (q) => q.eq("adm2Id", adm2Id))
        .collect();
    } else if (adm1Id) {
      places = await ctx.db
        .query("places")
        .withIndex("by_adm1", (q) => q.eq("adm1Id", adm1Id))
        .collect();
    } else if (countryCode) {
      places = await ctx.db
        .query("places")
        .withIndex("by_country", (q) => q.eq("countryCode", countryCode))
        .collect();
    } else if (continentName) {
      places = await ctx.db
        .query("places")
        .withIndex("by_continent", (q) => q.eq("continentName", continentName))
        .collect();
    } else {
      places = await ctx.db.query("places").collect();
    }

    if (args.featureType) {
      places = places.filter((p) => p.featureType === args.featureType);
    }

    if (args.minPopulation) {
      places = places.filter(
        (p) => p.population && p.population >= args.minPopulation!
      );
    }

    return places.length;
  },
});

// Get places by feature type (capitals for a specific scope)
export const getCapitals = query({
  args: {
    continentName: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    adm1Id: v.optional(v.id("areas")),
  },
  handler: async (ctx, args) => {
    let places;
    const { adm1Id, countryCode, continentName } = args;

    if (adm1Id) {
      places = await ctx.db
        .query("places")
        .withIndex("by_adm1", (q) => q.eq("adm1Id", adm1Id))
        .collect();
    } else if (countryCode) {
      places = await ctx.db
        .query("places")
        .withIndex("by_country_type", (q) =>
          q.eq("countryCode", countryCode).eq("featureType", "capital")
        )
        .collect();
    } else if (continentName) {
      places = await ctx.db
        .query("places")
        .withIndex("by_continent_type", (q) =>
          q.eq("continentName", continentName).eq("featureType", "capital")
        )
        .collect();
    } else {
      // World scope - get all capitals
      places = await ctx.db.query("places").collect();
      places = places.filter((p) => p.featureType === "capital");
    }

    return places.filter((p) => p.featureType === "capital");
  },
});
