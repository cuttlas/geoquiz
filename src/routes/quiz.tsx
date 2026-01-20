import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  quizSearchParamsSchema,
  type Place,
  type AreaWithGeometry,
} from "../lib/types";
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
  const [selectedRegion, setSelectedRegion] = useState<AreaWithGeometry | null>(
    null
  );

  // Lookup area IDs from slugs
  const adm1Area = useQuery(
    api.areas.getBySlug,
    search.adm1 ? { slug: search.adm1 } : "skip"
  );

  const adm2Area = useQuery(
    api.areas.getBySlug,
    search.adm2 ? { slug: search.adm2 } : "skip"
  );

  // Lookup country area for regions quiz when only country is selected
  const countryArea = useQuery(
    api.areas.getCountriesByContinent,
    search.country && search.type === "regions" && !search.adm1
      ? { continentName: search.continent ?? "" }
      : "skip"
  );
  const matchedCountry = countryArea?.find(
    (c) => c.countryCode === search.country
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

  // Fetch regions for regions quiz
  // Determine the parent for regions query:
  // - If adm1 selected, get adm2 children
  // - If country selected (no adm1), get adm1 children
  // - If only continent selected, get countries (adminLevel 0)
  const regionsQueryArgs = (() => {
    if (search.type !== "regions") return "skip" as const;

    if (search.adm1) {
      // Need adm1Area to be loaded
      if (!adm1Area?._id) return "skip" as const;
      return { parentAreaId: adm1Area._id };
    }

    if (search.country) {
      // Need matchedCountry to be loaded
      if (!matchedCountry?._id) return "skip" as const;
      return { parentAreaId: matchedCountry._id };
    }

    // Continent only - get countries
    return { continentName: search.continent, adminLevel: 0 };
  })();

  const regions = useQuery(api.areas.getAreasWithGeometries, regionsQueryArgs);

  const placesForMap = search.type !== "regions" ? (places ?? []) : [];
  const regionsForMap = search.type === "regions" ? (regions ?? []) : [];

  // Clear other selection when one is made
  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setSelectedRegion(null);
  };

  const handleRegionClick = (region: AreaWithGeometry) => {
    setSelectedRegion(region);
    setSelectedPlace(null);
  };

  // Build breadcrumb for current scope
  const breadcrumb = buildBreadcrumb(search);
  const itemCount =
    search.type === "regions" ? regionsForMap.length : placesForMap.length;
  const isLoading =
    search.type === "regions" ? regions === undefined : places === undefined;

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
            {itemCount} {search.type === "regions" ? "regions" : "places"}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : itemCount === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">
              No {search.type === "regions" ? "regions" : "places"} found for
              this selection
            </p>
          </div>
        ) : (
          <QuizMap
            places={search.type !== "regions" ? placesForMap : undefined}
            regions={search.type === "regions" ? regionsForMap : undefined}
            selectedRegionId={selectedRegion?._id}
            onPlaceClick={handlePlaceClick}
            onRegionClick={handleRegionClick}
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
          <p className="text-sm text-gray-600 capitalize">
            {selectedPlace.featureType}
          </p>
          {selectedPlace.population && (
            <p className="text-sm text-gray-500">
              Population: {selectedPlace.population.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Selected Region Info Panel */}
      {selectedRegion && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs z-[1000]">
          <button
            onClick={() => setSelectedRegion(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-gray-900">{selectedRegion.name}</h3>
          <p className="text-sm text-gray-600">{selectedRegion.adminTypeName}</p>
          <p className="text-sm text-gray-500">{selectedRegion.countryCode}</p>
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
