import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Types for import data
const areaData = v.object({
  name: v.string(),
  slug: v.string(),
  adminTypeName: v.string(),
  adminLevel: v.number(),
  countryCode: v.string(),
  continentName: v.string(),
  parentAreaId: v.optional(v.id("areas")),
  centroidLat: v.number(),
  centroidLng: v.number(),
  geoboundariesId: v.string(),
  geojson: v.optional(v.string()), // GeoJSON to store in geometries table
});

const placeData = v.object({
  name: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  continentName: v.string(),
  countryCode: v.string(),
  adm1Id: v.optional(v.id("areas")),
  adm2Id: v.optional(v.id("areas")),
  featureType: v.string(),
  population: v.optional(v.number()),
  imageUrl: v.optional(v.string()),
  wikipediaUrl: v.optional(v.string()),
  wikidataId: v.string(),
});

// Upsert a single area (used for testing/debugging)
export const upsertArea = mutation({
  args: { area: areaData },
  handler: async (ctx, { area }) => {
    // Check if exists by geoboundariesId
    const existing = await ctx.db
      .query("areas")
      .withIndex("by_geoboundaries_id", (q) =>
        q.eq("geoboundariesId", area.geoboundariesId)
      )
      .first();

    // Store geometry if provided
    let geometryId: Id<"geometries"> | undefined;
    if (area.geojson) {
      if (existing?.geometryId) {
        // Update existing geometry
        await ctx.db.patch(existing.geometryId, { geojson: area.geojson });
        geometryId = existing.geometryId;
      } else {
        // Create new geometry
        geometryId = await ctx.db.insert("geometries", {
          geojson: area.geojson,
        });
      }
    }

    const areaRecord = {
      name: area.name,
      slug: area.slug,
      adminTypeName: area.adminTypeName,
      adminLevel: area.adminLevel,
      countryCode: area.countryCode,
      continentName: area.continentName,
      parentAreaId: area.parentAreaId,
      centroidLat: area.centroidLat,
      centroidLng: area.centroidLng,
      geoboundariesId: area.geoboundariesId,
      geometryId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, areaRecord);
      return existing._id;
    } else {
      return await ctx.db.insert("areas", areaRecord);
    }
  },
});

// Batch upsert areas
export const upsertAreas = internalMutation({
  args: { areas: v.array(areaData) },
  handler: async (ctx, { areas }) => {
    const results: Id<"areas">[] = [];

    for (const area of areas) {
      // Check if exists by geoboundariesId
      const existing = await ctx.db
        .query("areas")
        .withIndex("by_geoboundaries_id", (q) =>
          q.eq("geoboundariesId", area.geoboundariesId)
        )
        .first();

      // Store geometry if provided
      let geometryId: Id<"geometries"> | undefined;
      if (area.geojson) {
        if (existing?.geometryId) {
          await ctx.db.patch(existing.geometryId, { geojson: area.geojson });
          geometryId = existing.geometryId;
        } else {
          geometryId = await ctx.db.insert("geometries", {
            geojson: area.geojson,
          });
        }
      }

      const areaRecord = {
        name: area.name,
        slug: area.slug,
        adminTypeName: area.adminTypeName,
        adminLevel: area.adminLevel,
        countryCode: area.countryCode,
        continentName: area.continentName,
        parentAreaId: area.parentAreaId,
        centroidLat: area.centroidLat,
        centroidLng: area.centroidLng,
        geoboundariesId: area.geoboundariesId,
        geometryId,
      };

      if (existing) {
        await ctx.db.patch(existing._id, areaRecord);
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("areas", areaRecord);
        results.push(id);
      }
    }

    return results;
  },
});

// Upsert a single place
export const upsertPlace = mutation({
  args: { place: placeData },
  handler: async (ctx, { place }) => {
    const existing = await ctx.db
      .query("places")
      .withIndex("by_wikidata_id", (q) => q.eq("wikidataId", place.wikidataId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, place);
      return existing._id;
    } else {
      return await ctx.db.insert("places", place);
    }
  },
});

// Batch upsert places
export const upsertPlaces = internalMutation({
  args: { places: v.array(placeData) },
  handler: async (ctx, { places }) => {
    const results: Id<"places">[] = [];

    for (const place of places) {
      const existing = await ctx.db
        .query("places")
        .withIndex("by_wikidata_id", (q) => q.eq("wikidataId", place.wikidataId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, place);
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("places", place);
        results.push(id);
      }
    }

    return results;
  },
});

// Get area by geoboundariesId (for parent lookup)
export const getAreaByGeoboundariesId = query({
  args: { geoboundariesId: v.string() },
  handler: async (ctx, { geoboundariesId }) => {
    return await ctx.db
      .query("areas")
      .withIndex("by_geoboundaries_id", (q) =>
        q.eq("geoboundariesId", geoboundariesId)
      )
      .first();
  },
});

// Get all areas for a country at a specific admin level (for spatial matching)
export const getAreasForSpatialMatch = query({
  args: { countryCode: v.string(), adminLevel: v.number() },
  handler: async (ctx, { countryCode, adminLevel }) => {
    const areas = await ctx.db
      .query("areas")
      .withIndex("by_country_level", (q) =>
        q.eq("countryCode", countryCode).eq("adminLevel", adminLevel)
      )
      .collect();

    // Fetch geometries for each area
    const areasWithGeometry = await Promise.all(
      areas.map(async (area) => {
        let geojson: string | null = null;
        if (area.geometryId) {
          const geometry = await ctx.db.get(area.geometryId);
          geojson = geometry?.geojson ?? null;
        }
        return { ...area, geojson };
      })
    );

    return areasWithGeometry;
  },
});

// Clear all imported data (for testing/reset)
// Uses pagination to handle large datasets without timing out
const CLEAR_BATCH_SIZE = 500;

export const clearAllImportedData = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedPlaces = 0;
    let deletedAreas = 0;
    let deletedGeometries = 0;

    // Delete places in batches
    const places = await ctx.db.query("places").take(CLEAR_BATCH_SIZE);
    for (const place of places) {
      await ctx.db.delete(place._id);
      deletedPlaces++;
    }

    // Delete areas and their geometries in batches
    const areas = await ctx.db.query("areas").take(CLEAR_BATCH_SIZE);
    for (const area of areas) {
      if (area.geometryId) {
        await ctx.db.delete(area.geometryId);
        deletedGeometries++;
      }
      await ctx.db.delete(area._id);
      deletedAreas++;
    }

    // Check if more work is needed
    const hasMorePlaces = (await ctx.db.query("places").first()) !== null;
    const hasMoreAreas = (await ctx.db.query("areas").first()) !== null;

    return {
      deletedPlaces,
      deletedAreas,
      deletedGeometries,
      done: !hasMorePlaces && !hasMoreAreas,
    };
  },
});
