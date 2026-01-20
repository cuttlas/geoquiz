# GeoQuiz - Tech Stack

## Overview
This document describes the technology choices for the GeoQuiz application.

---

## Frontend

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 6.x | Build tool and dev server |

### Routing & Data
| Technology | Purpose |
|------------|---------|
| **TanStack Router** | File-based routing with full TypeScript support |
| **Zod** | Schema validation for URL search params |
| **Convex React** | Data fetching with `useQuery` and `useMutation` hooks |

### Styling & UI
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Accessible UI components (Select, Button, etc.) |
| **Lucide React** | Icon library |

### Maps
| Technology | Purpose |
|------------|---------|
| **React Leaflet** | React wrapper for Leaflet maps |
| **Leaflet** | Interactive map library |

---

## Backend

### Convex
Convex serves as the complete backend solution:

| Feature | Usage |
|---------|-------|
| **Database** | Store places and areas with hierarchy |
| **Queries** | Fetch areas by parent, places by scope |
| **Mutations** | Bulk data import |

### Schema Design

```typescript
// convex/schema.ts
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
    countryCode: v.string(),        // ISO alpha-3
    adm1Id: v.optional(v.id("areas")),  // State/Province reference
    adm2Id: v.optional(v.id("areas")),  // County/District reference
    featureType: v.string(),        // "city", "capital", "town"
    population: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    wikipediaUrl: v.optional(v.string()),
    // Source tracking for idempotent imports
    wikidataId: v.optional(v.string()),  // e.g., "Q90" for Paris
  })
    .index("by_continent", ["continentName"])
    .index("by_country", ["countryCode"])
    .index("by_adm1", ["adm1Id"])
    .index("by_adm2", ["adm2Id"])
    .index("by_continent_type", ["continentName", "featureType"])
    .index("by_country_type", ["countryCode", "featureType"])
    .index("by_wikidata_id", ["wikidataId"]),

  // Countries, states, provinces, counties, etc.
  areas: defineTable({
    name: v.string(),
    slug: v.string(),               // URL-friendly ID (e.g., "west-java")
    adminTypeName: v.string(),      // "Province", "State", "Kabupaten", etc.
    adminLevel: v.number(),         // 0=country, 1=state, 2=county, etc.
    countryCode: v.string(),        // ISO alpha-3
    continentName: v.string(),
    parentAreaId: v.optional(v.id("areas")), // For hierarchy traversal
    centroidLat: v.number(),
    centroidLng: v.number(),
    geometryId: v.optional(v.id("geometries")),
    // Source tracking for idempotent imports
    geoboundariesId: v.optional(v.string()),  // e.g., "USA-ADM1-06"
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentAreaId"])
    .index("by_continent_level", ["continentName", "adminLevel"])
    .index("by_country_level", ["countryCode", "adminLevel"])
    .index("by_geoboundaries_id", ["geoboundariesId"]),

  // GeoJSON geometries (stored separately due to size)
  geometries: defineTable({
    geojson: v.string(),
  }),
});
```

**Schema notes:**
- Places have denormalized `adm1Id` and `adm2Id` for efficient querying at any scope
- Areas use `parentAreaId` for cascading dropdowns and "Regions" quiz type
- `slug` on areas enables URL-friendly identifiers (e.g., `adm1=west-java`)
- Compound indexes (`by_continent_type`, etc.) optimize common query patterns
- Geometries separated to handle large polygons (simplify before import)

### Key Queries

```typescript
// convex/areas.ts

// Get child areas of a parent (for cascading dropdowns)
export const getChildren = query({
  args: { parentAreaId: v.optional(v.id("areas")) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("areas")
      .withIndex("by_parent", (q) => q.eq("parentAreaId", args.parentAreaId))
      .collect();
  },
});

// Get countries in a continent (for country dropdown)
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

// convex/places.ts

// Get places for quiz - by continent
export const getByContinent = query({
  args: {
    continentName: v.string(),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("places")
      .withIndex("by_continent", (q) => q.eq("continentName", args.continentName));

    if (args.featureType) {
      q = q.filter((q) => q.eq(q.field("featureType"), args.featureType));
    }
    if (args.minPopulation) {
      q = q.filter((q) => q.gte(q.field("population"), args.minPopulation));
    }
    return q.collect();
  },
});

// Get places for quiz - by country
export const getByCountry = query({
  args: {
    countryCode: v.string(),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("places")
      .withIndex("by_country", (q) => q.eq("countryCode", args.countryCode));

    if (args.featureType) {
      q = q.filter((q) => q.eq(q.field("featureType"), args.featureType));
    }
    if (args.minPopulation) {
      q = q.filter((q) => q.gte(q.field("population"), args.minPopulation));
    }
    return q.collect();
  },
});

// Get places for quiz - by ADM1 (state/province)
export const getByAdm1 = query({
  args: {
    adm1Id: v.id("areas"),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("places")
      .withIndex("by_adm1", (q) => q.eq("adm1Id", args.adm1Id));

    if (args.featureType) {
      q = q.filter((q) => q.eq(q.field("featureType"), args.featureType));
    }
    if (args.minPopulation) {
      q = q.filter((q) => q.gte(q.field("population"), args.minPopulation));
    }
    return q.collect();
  },
});

// Get places for quiz - by ADM2 (county/district)
export const getByAdm2 = query({
  args: {
    adm2Id: v.id("areas"),
    featureType: v.optional(v.string()),
    minPopulation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("places")
      .withIndex("by_adm2", (q) => q.eq("adm2Id", args.adm2Id));

    if (args.featureType) {
      q = q.filter((q) => q.eq(q.field("featureType"), args.featureType));
    }
    if (args.minPopulation) {
      q = q.filter((q) => q.gte(q.field("population"), args.minPopulation));
    }
    return q.collect();
  },
});
```

**Query patterns:**
| Quiz Scope | Query Used |
|------------|------------|
| World → Cities | `getByContinent` with no continent filter (full scan + filter) |
| Europe → Capitals | `getByContinent("Europe", "capital")` |
| France → Cities 100K+ | `getByCountry("FRA", "city", 100000)` |
| California → Cities | `getByAdm1(californiaId, "city")` |
| Île-de-France → Regions | `areas.getChildren(ileDefranceId)` |

---

## Testing

### E2E Testing
| Technology | Purpose |
|------------|---------|
| **Playwright** | End-to-end browser testing |

### Test Coverage
- Quiz generator loads and cascading works
- Quiz navigation and gameplay
- Answer validation (correct/incorrect)
- Score calculation
- Shareable URL works
- Theme toggle persistence

---

## Data Sources & Import

### Places Data: Wikidata
- Source: Wikidata Query Service (SPARQL)
- Data: Cities, capitals, populated places
- Fields: Name, coordinates, population, country, continent

### Areas Data: GeoBoundaries
- Source: GeoBoundaries API
- Data: Administrative boundaries (countries, states, counties)
- Fields: Name, geometry, admin level, centroid, parent reference

### Import Scripts

The `scripts/` directory contains Node.js scripts to import real data:

```bash
# Import areas (countries, states, counties) from GeoBoundaries
npm run import:areas

# Import places (cities, capitals) from Wikidata
npm run import:places

# Import everything in order
npm run import:all
```

**Configuration:** Edit `scripts/config.ts` to adjust:
- `populationThreshold`: Minimum population for cities (default: 100,000)
- `adm1Countries`: Countries to import state/province data for
- `adm2Countries`: Countries to import county/district data for
- `simplifyTolerance`: GeoJSON simplification factor

**Import order matters:**
1. Areas ADM0 (countries) - no parent references
2. Areas ADM1 (states) - reference countries
3. Areas ADM2 (counties) - reference states
4. Places - reference areas via spatial matching

**Re-running imports:**
- Imports are idempotent using source IDs (`wikidataId`, `geoboundariesId`)
- Re-running will update existing records, not create duplicates

### Import Dependencies

```json
{
  "@turf/center-of-mass": "^7.x",  // Centroid calculation
  "@turf/simplify": "^7.x",        // Geometry simplification
  "@turf/boolean-point-in-polygon": "^7.x",  // Spatial matching
  "axios": "^1.x",                 // HTTP client
  "country-iso-2-to-3": "^1.x",    // Country code conversion
  "slugify": "^1.x"                // URL-friendly slugs
}
```

---

## Project Structure

```
hartford/
├── convex/                    # Convex backend
│   ├── schema.ts              # Database schema
│   ├── places.ts              # Place queries
│   ├── areas.ts               # Area queries
│   ├── seed.ts                # Mock data seeding
│   └── import.ts              # Bulk import mutations
│
├── scripts/                   # Data import scripts
│   ├── config.ts              # Import configuration
│   ├── import-areas.ts        # GeoBoundaries → Convex
│   ├── import-places.ts       # Wikidata → Convex
│   ├── lib/
│   │   ├── geoboundaries.ts   # GeoBoundaries API client
│   │   ├── wikidata.ts        # Wikidata SPARQL client
│   │   └── geo-utils.ts       # Centroid, slug, simplify helpers
│   └── data/                  # GeoJSON cache (gitignored)
│
├── src/
│   ├── main.tsx               # App entry point
│   ├── index.css              # Global styles + Tailwind
│   │
│   ├── routes/                # TanStack Router pages
│   │   ├── __root.tsx         # Root layout
│   │   ├── index.tsx          # Landing page (quiz generator)
│   │   └── quiz.tsx           # Quiz page (reads URL search params)
│   │
│   ├── components/            # React components
│   │   ├── QuizSelector.tsx   # Cascading scope selector
│   │   ├── map/
│   │   │   ├── QuizMap.tsx    # Leaflet map
│   │   │   └── PlaceMarker.tsx
│   │   └── ui/                # shadcn/ui components
│   │
│   └── lib/                   # Utilities
│       ├── types.ts
│       └── utils.ts
│
├── e2e/                       # Playwright tests
│   ├── home.spec.ts
│   ├── quiz-selector.spec.ts
│   └── quiz.spec.ts
│
├── docs/                      # Documentation
│   ├── requirements.md
│   └── tech-stack.md
│
├── public/                    # Static assets
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── playwright.config.ts
```

---

## Environment Variables

```bash
# .env.local
CONVEX_DEPLOYMENT=<your-convex-deployment>
VITE_CONVEX_URL=<your-convex-url>
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start Convex dev server (deploys backend)
npx convex dev

# Start Vite dev server (frontend)
npm run dev

# Run Playwright E2E tests
npm run test:e2e

# Build for production
npm run build

# Import real data (requires CONVEX_URL environment variable)
export CONVEX_URL=<your-convex-url>
npm run import:areas    # Import countries, states, counties
npm run import:places   # Import cities, capitals
npm run import:all      # Import everything in order
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-router": "^1.x",
    "zod": "^3.x",
    "convex": "^1.x",
    "leaflet": "^1.9.x",
    "react-leaflet": "^5.x",
    "lucide-react": "^0.x",
    "@radix-ui/react-select": "^2.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^6.x",
    "@tanstack/router-plugin": "^1.x",
    "tailwindcss": "^4.x",
    "@playwright/test": "^1.x"
  }
}
```

Note: shadcn/ui components are copy-pasted into the project (not installed as a package). The Radix primitives and utility libraries (cva, clsx, tailwind-merge) support them.
