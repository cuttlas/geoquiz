import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  CONTINENTS,
  QUIZ_TYPES,
  POPULATION_OPTIONS,
  type QuizType,
  type Continent,
  type Area,
  type QuizSearchParams,
} from "../lib/types";
import { cn } from "../lib/utils";

export function QuizSelector() {
  const navigate = useNavigate();

  // Selection state
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(
    null
  );
  const [selectedCountry, setSelectedCountry] = useState<Area | null>(null);
  const [selectedAdm1, setSelectedAdm1] = useState<Area | null>(null);
  const [selectedAdm2, setSelectedAdm2] = useState<Area | null>(null);
  const [quizType, setQuizType] = useState<QuizType>("cities");
  const [minPopulation, setMinPopulation] = useState<number | null>(null);

  // Fetch countries when continent is selected
  const countries = useQuery(
    api.areas.getCountriesByContinent,
    selectedContinent ? { continentName: selectedContinent } : "skip"
  );

  // Fetch ADM1 regions when country is selected
  const adm1Regions = useQuery(
    api.areas.getChildAreas,
    selectedCountry ? { parentAreaId: selectedCountry._id } : "skip"
  );

  // Fetch ADM2 regions when ADM1 is selected
  const adm2Regions = useQuery(
    api.areas.getChildAreas,
    selectedAdm1 ? { parentAreaId: selectedAdm1._id } : "skip"
  );

  // Count items for preview
  const itemCount = useQuery(api.places.countPlaces, {
    continentName: selectedContinent ?? undefined,
    countryCode: selectedCountry?.countryCode,
    adm1Id: selectedAdm1?._id,
    adm2Id: selectedAdm2?._id,
    featureType: quizType === "regions" ? undefined : quizType === "capitals" ? "capital" : "city",
    minPopulation: quizType === "cities" ? (minPopulation ?? undefined) : undefined,
  });

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedCountry(null);
    setSelectedAdm1(null);
    setSelectedAdm2(null);
  }, [selectedContinent]);

  useEffect(() => {
    setSelectedAdm1(null);
    setSelectedAdm2(null);
  }, [selectedCountry]);

  useEffect(() => {
    setSelectedAdm2(null);
  }, [selectedAdm1]);

  // Check if regions quiz type is available (has children at next level)
  const hasChildRegions =
    quizType === "regions"
      ? selectedAdm1
        ? (adm2Regions?.length ?? 0) > 0
        : selectedCountry
          ? (adm1Regions?.length ?? 0) > 0
          : selectedContinent
            ? (countries?.length ?? 0) > 0
            : false
      : true;

  // Get the display count based on quiz type
  const displayCount =
    quizType === "regions"
      ? selectedAdm1
        ? adm2Regions?.length ?? 0
        : selectedCountry
          ? adm1Regions?.length ?? 0
          : selectedContinent
            ? countries?.length ?? 0
            : 0
      : itemCount ?? 0;

  const handleGenerate = () => {
    // Build search params with proper typing
    const searchParams: QuizSearchParams = {
      type: quizType,
      ...(selectedContinent && { continent: selectedContinent }),
      ...(selectedCountry && { country: selectedCountry.countryCode }),
      ...(selectedAdm1 && { adm1: selectedAdm1.slug }),
      ...(selectedAdm2 && { adm2: selectedAdm2.slug }),
      ...(quizType === "cities" && minPopulation && { minPop: minPopulation }),
    };

    navigate({ to: "/quiz", search: searchParams });
  };

  const canGenerate = selectedContinent && displayCount > 0;

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Continent Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Continent</label>
        <Select
          value={selectedContinent ?? ""}
          onValueChange={(value) => setSelectedContinent(value as Continent)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select continent..." />
          </SelectTrigger>
          <SelectContent>
            {CONTINENTS.map((continent) => (
              <SelectItem key={continent} value={continent}>
                {continent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Country Selection (optional) */}
      {selectedContinent && countries && countries.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Country (optional)
          </label>
          <Select
            value={selectedCountry?.slug ?? ""}
            onValueChange={(value) => {
              const country = countries.find((c) => c.slug === value);
              setSelectedCountry(country ?? null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country._id} value={country.slug}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ADM1 Selection (optional) */}
      {selectedCountry && adm1Regions && adm1Regions.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {adm1Regions[0]?.adminTypeName ?? "Region"} (optional)
          </label>
          <Select
            value={selectedAdm1?.slug ?? ""}
            onValueChange={(value) => {
              const region = adm1Regions.find((r) => r.slug === value);
              setSelectedAdm1(region ?? null);
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${adm1Regions[0]?.adminTypeName?.toLowerCase() ?? "region"}...`}
              />
            </SelectTrigger>
            <SelectContent>
              {adm1Regions.map((region) => (
                <SelectItem key={region._id} value={region.slug}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ADM2 Selection (optional) */}
      {selectedAdm1 && adm2Regions && adm2Regions.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {adm2Regions[0]?.adminTypeName ?? "District"} (optional)
          </label>
          <Select
            value={selectedAdm2?.slug ?? ""}
            onValueChange={(value) => {
              const region = adm2Regions.find((r) => r.slug === value);
              setSelectedAdm2(region ?? null);
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${adm2Regions[0]?.adminTypeName?.toLowerCase() ?? "district"}...`}
              />
            </SelectTrigger>
            <SelectContent>
              {adm2Regions.map((region) => (
                <SelectItem key={region._id} value={region.slug}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quiz Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          What do you want to identify?
        </label>
        <div className="flex gap-2">
          {QUIZ_TYPES.map((type) => (
            <Button
              key={type}
              variant={quizType === type ? "default" : "outline"}
              className={cn("flex-1 capitalize")}
              onClick={() => setQuizType(type)}
              disabled={type === "regions" && !hasChildRegions}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Population Filter (Cities only) */}
      {quizType === "cities" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Minimum Population
          </label>
          <Select
            value={minPopulation?.toString() ?? "any"}
            onValueChange={(value) =>
              setMinPopulation(value === "any" ? null : parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select minimum population..." />
            </SelectTrigger>
            <SelectContent>
              {POPULATION_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value ?? "any"}
                  value={option.value?.toString() ?? "any"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Generate Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        Generate Quiz ({displayCount} items)
      </Button>
    </div>
  );
}
