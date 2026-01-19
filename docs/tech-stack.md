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
    slug: v.string(),               // URL-friendly ID (e.g., "west-java")
    adminTypeName: v.string(),      // "Province", "State", "Kabupaten", etc.
    adminLevel: v.number(),         // 0=country, 1=state, 2=county, etc.
    countryCode: v.string(),        // ISO alpha-3
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

## Data Sources

### Places Data: Wikidata
- Source: Wikidata Query Service (SPARQL)
- Data: Cities, capitals, populated places
- Fields: Name, coordinates, population, country, continent

### Areas Data: GeoBoundaries
- Source: GeoBoundaries API
- Data: Administrative boundaries (countries, states, counties)
- Fields: Name, geometry, admin level, centroid, parent reference

---

## Project Structure

```
budapest/
├── convex/                    # Convex backend
│   ├── schema.ts              # Database schema
│   ├── places.ts              # Place queries
│   └── areas.ts               # Area queries
│
├── scripts/                   # Data import scripts
│   ├── import-wikidata.ts     # Fetch places from Wikidata
│   └── import-geoboundaries.ts# Fetch areas from GeoBoundaries
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
│   │   ├── QuizGenerator.tsx  # Cascading scope selector
│   │   ├── QuizMap.tsx        # Leaflet map
│   │   ├── QuizSidebar.tsx    # Quiz controls
│   │   ├── CascadingSelect.tsx# Reusable cascading dropdown
│   │   ├── MapLayerSelector.tsx
│   │   └── ThemeToggle.tsx
│   │
│   └── lib/                   # Utilities
│       └── utils.ts
│
├── e2e/                       # Playwright tests
│   ├── generator.spec.ts
│   └── quiz.spec.ts
│
├── public/                    # Static assets
│   └── icon.png
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── playwright.config.ts
└── convex.json
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

# Start Convex dev server
npx convex dev

# Start Vite dev server
npm run dev

# Run Playwright tests
npx playwright test

# Build for production
npm run build
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
