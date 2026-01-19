import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { quizSearchParamsSchema, type Place } from "../lib/types";
import { Button } from "../components/ui/button";
import { QuizMap } from "../components/map/QuizMap";
import { useState } from "react";

export const Route = createFileRoute("/quiz")({
  validateSearch: quizSearchParamsSchema,
  component: QuizPage,
});

function QuizPage() {
  const search = Route.useSearch();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Lookup area IDs from slugs
  const adm1Area = useQuery(
    api.areas.getBySlug,
    search.adm1 ? { slug: search.adm1 } : "skip"
  );

  const adm2Area = useQuery(
    api.areas.getBySlug,
    search.adm2 ? { slug: search.adm2 } : "skip"
  );

  // Fetch places for cities/capitals quiz
  const places = useQuery(
    api.places.getPlaces,
    search.type !== "regions"
      ? {
          continentName: search.continent,
          countryCode: search.country,
          adm1Id: adm1Area?._id,
          adm2Id: adm2Area?._id,
          featureType: search.type === "capitals" ? "capital" : "city",
          minPopulation: search.minPop,
        }
      : "skip"
  );

  // For cities/capitals, use the places directly
  const placesForMap = search.type !== "regions" ? (places ?? []) : [];

  // Build breadcrumb for current scope
  const breadcrumb = buildBreadcrumb(search);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Quiz: {search.type.charAt(0).toUpperCase() + search.type.slice(1)}
              </h1>
              <p className="text-sm text-gray-600">{breadcrumb}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {placesForMap.length} places
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {search.type === "regions" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Regions quiz not yet supported on map</p>
          </div>
        ) : placesForMap.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading places...</p>
          </div>
        ) : (
          <QuizMap
            places={placesForMap}
            onPlaceClick={(place) => setSelectedPlace(place)}
          />
        )}
      </div>

      {/* Selected Place Info Panel */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs z-[1000]">
          <button
            onClick={() => setSelectedPlace(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-gray-900">{selectedPlace.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{selectedPlace.featureType}</p>
          {selectedPlace.population && (
            <p className="text-sm text-gray-500">
              Population: {selectedPlace.population.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to build breadcrumb string
function buildBreadcrumb(search: {
  continent?: string;
  country?: string;
  adm1?: string;
  adm2?: string;
}): string {
  const parts: string[] = [];
  if (search.continent) parts.push(search.continent);
  if (search.country) parts.push(search.country);
  if (search.adm1) parts.push(search.adm1);
  if (search.adm2) parts.push(search.adm2);
  return parts.join(" > ") || "World";
}

// Simple arrow icon
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

// Simple close icon
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
