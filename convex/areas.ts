import { query } from "./_generated/server";
import { v } from "convex/values";

// List of continents (hardcoded since they're static)
export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;

// Get list of all continents
export const listContinents = query({
  args: {},
  handler: async () => {
    return CONTINENTS;
  },
});

// Get countries by continent (adminLevel 0)
export const getCountriesByContinent = query({
  args: { continentName: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("areas")
      .withIndex("by_continent_level", (q) =>
        q.eq("continentName", args.continentName).eq("adminLevel", 0)
      )
      .collect();
  },
});

// Get child areas by parent ID (for cascading dropdowns)
export const getChildAreas = query({
  args: { parentAreaId: v.id("areas") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("areas")
      .withIndex("by_parent", (q) => q.eq("parentAreaId", args.parentAreaId))
      .collect();
  },
});

// Get area by slug (for URL param lookup)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("areas")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get area by ID
export const getById = query({
  args: { id: v.id("areas") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// Check if an area has children (to determine if "Regions" quiz type is available)
export const hasChildren = query({
  args: { parentAreaId: v.id("areas") },
  handler: async (ctx, args) => {
    const child = await ctx.db
      .query("areas")
      .withIndex("by_parent", (q) => q.eq("parentAreaId", args.parentAreaId))
      .first();
    return child !== null;
  },
});
