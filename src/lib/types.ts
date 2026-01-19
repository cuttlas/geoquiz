import { z } from "zod";
import type { Id } from "../../convex/_generated/dataModel";

// Quiz types that users can choose
export const QUIZ_TYPES = ["cities", "capitals", "regions"] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

// Population filter options
export const POPULATION_OPTIONS = [
  { label: "Any", value: null },
  { label: "100K+", value: 100_000 },
  { label: "500K+", value: 500_000 },
  { label: "1M+", value: 1_000_000 },
  { label: "5M+", value: 5_000_000 },
  { label: "10M+", value: 10_000_000 },
] as const;

// Continent list
export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;
export type Continent = (typeof CONTINENTS)[number];

// Quiz configuration state (internal)
export interface QuizConfig {
  continent: Continent | null;
  countrySlug: string | null;
  adm1Slug: string | null;
  adm2Slug: string | null;
  quizType: QuizType;
  minPopulation: number | null;
}

// URL search params schema for quiz route
export const quizSearchParamsSchema = z.object({
  continent: z.string().optional(),
  country: z.string().optional(), // ISO alpha-3 code
  adm1: z.string().optional(), // slug
  adm2: z.string().optional(), // slug
  type: z.enum(QUIZ_TYPES),
  minPop: z.coerce.number().optional(),
});

export type QuizSearchParams = z.infer<typeof quizSearchParamsSchema>;

// Area type from Convex
export interface Area {
  _id: Id<"areas">;
  name: string;
  slug: string;
  adminTypeName: string;
  adminLevel: number;
  countryCode: string;
  continentName: string;
  parentAreaId?: Id<"areas">;
  centroidLat: number;
  centroidLng: number;
  geometryId?: Id<"geometries">;
}

// Place type from Convex
export interface Place {
  _id: Id<"places">;
  name: string;
  latitude: number;
  longitude: number;
  continentName: string;
  countryCode: string;
  adm1Id?: Id<"areas">;
  adm2Id?: Id<"areas">;
  featureType: string;
  population?: number;
  imageUrl?: string;
  wikipediaUrl?: string;
}
