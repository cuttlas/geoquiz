import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { quizSearchParamsSchema, type Place, type Area } from "../lib/types";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/quiz")({
  validateSearch: quizSearchParamsSchema,
  component: QuizPage,
});

function QuizPage() {
  const search = Route.useSearch();

  // Lookup area IDs from slugs
  const adm1Area = useQuery(
    api.areas.getBySlug,
    search.adm1 ? { slug: search.adm1 } : "skip"
  );

  const adm2Area = useQuery(
    api.areas.getBySlug,
    search.adm2 ? { slug: search.adm2 } : "skip"
  );

  // Get countries for regions quiz type at continent level
  const countriesForRegions = useQuery(
    api.areas.getCountriesByContinent,
    search.type === "regions" && search.continent && !search.country
      ? { continentName: search.continent }
      : "skip"
  );

  // Get child regions for regions quiz type
  const childRegions = useQuery(
    api.areas.getChildAreas,
    search.type === "regions" && adm1Area
      ? { parentAreaId: adm1Area._id }
      : "skip"
  );

  // Lookup country area to get child regions
  const countryArea = useQuery(
    api.areas.getBySlug,
    search.type === "regions" && search.country && !search.adm1
      ? { slug: getCountrySlug(search.country) }
      : "skip"
  );

  // Get ADM1 regions for country-level regions quiz
  const countryChildRegions = useQuery(
    api.areas.getChildAreas,
    countryArea ? { parentAreaId: countryArea._id } : "skip"
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

  // Determine what items to display based on quiz type
  let items: Array<{ name: string; subtitle: string; type: string }> = [];

  if (search.type === "regions") {
    // Regions quiz - display areas
    let regions: Area[] = [];
    if (search.adm1 && childRegions) {
      regions = childRegions as Area[];
    } else if (search.country && countryChildRegions) {
      regions = countryChildRegions as Area[];
    } else if (search.continent && countriesForRegions) {
      regions = countriesForRegions as Area[];
    }

    items = regions.map((region) => ({
      name: region.name,
      subtitle: `${region.adminTypeName} (${region.countryCode})`,
      type: "region",
    }));
  } else {
    // Cities/Capitals quiz - display places
    items = (places ?? []).map((place: Place) => ({
      name: place.name,
      subtitle: `${place.featureType} - ${formatPopulation(place.population)}`,
      type: place.featureType,
    }));
  }

  // Build breadcrumb for current scope
  const breadcrumb = buildBreadcrumb(search);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Quiz Generator
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quiz: {search.type.charAt(0).toUpperCase() + search.type.slice(1)}
          </h1>
          <p className="text-gray-600">{breadcrumb}</p>
        </div>

        {/* Quiz Items */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            {items.length} items in this quiz
          </h2>
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Loading quiz items...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500 mt-1">{item.subtitle}</div>
              </div>
            ))}
          </div>
        )}
      </div>
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

// Helper to format population
function formatPopulation(pop?: number): string {
  if (!pop) return "Unknown population";
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return pop.toString();
}

// Helper to convert country code to slug (simplified)
function getCountrySlug(countryCode: string): string {
  // This is a simplified mapping - in production would use a proper lookup
  const codeToSlug: Record<string, string> = {
    FRA: "france",
    DEU: "germany",
    ITA: "italy",
    ESP: "spain",
    GBR: "united-kingdom",
    POL: "poland",
    NLD: "netherlands",
    BEL: "belgium",
    SWE: "sweden",
    PRT: "portugal",
    USA: "united-states",
    CAN: "canada",
    MEX: "mexico",
    JPN: "japan",
    CHN: "china",
    IND: "india",
    IDN: "indonesia",
    KOR: "south-korea",
    BRA: "brazil",
    ARG: "argentina",
    ZAF: "south-africa",
    EGY: "egypt",
    NGA: "nigeria",
    AUS: "australia",
    NZL: "new-zealand",
  };
  return codeToSlug[countryCode] ?? countryCode.toLowerCase();
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
