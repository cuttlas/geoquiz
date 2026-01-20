import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { LatLngBounds, type LatLngTuple } from "leaflet";
import { useEffect, useMemo } from "react";
import { PlaceMarker } from "./PlaceMarker";
import { RegionPolygon } from "./RegionPolygon";
import type { Place, AreaWithGeometry } from "../../lib/types";
import type { Feature, Polygon, MultiPolygon } from "geojson";

interface QuizMapProps {
  places?: Place[];
  regions?: AreaWithGeometry[];
  selectedRegionId?: string;
  onPlaceClick?: (place: Place) => void;
  onRegionClick?: (region: AreaWithGeometry) => void;
}

// Component to auto-fit bounds when data changes
function FitBounds({
  places,
  regions,
}: {
  places?: Place[];
  regions?: AreaWithGeometry[];
}) {
  const map = useMap();

  // Calculate bounds from regions' geometries
  const regionBounds = useMemo(() => {
    if (!regions || regions.length === 0) return null;

    const allCoords: LatLngTuple[] = [];

    for (const region of regions) {
      if (!region.geojson) continue;
      try {
        const geojson: Feature<Polygon | MultiPolygon> = JSON.parse(
          region.geojson
        );
        // Extract all coordinates from the geometry
        const extractCoords = (coords: number[][][]): void => {
          coords.forEach((ring) =>
            ring.forEach(([lng, lat]) => {
              allCoords.push([lat, lng] as LatLngTuple);
            })
          );
        };

        if (geojson.geometry.type === "Polygon") {
          extractCoords(geojson.geometry.coordinates);
        } else {
          geojson.geometry.coordinates.forEach(extractCoords);
        }
      } catch {
        // Use centroid as fallback
        allCoords.push([region.centroidLat, region.centroidLng] as LatLngTuple);
      }
    }

    return allCoords.length > 0 ? new LatLngBounds(allCoords) : null;
  }, [regions]);

  useEffect(() => {
    // Priority: regions bounds, then places bounds
    if (regionBounds) {
      map.fitBounds(regionBounds, { padding: [50, 50] });
      return;
    }

    if (!places || places.length === 0) return;

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 10);
    } else {
      const bounds = new LatLngBounds(
        places.map((p) => [p.latitude, p.longitude] as LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, regionBounds, map]);

  return null;
}

export function QuizMap({
  places,
  regions,
  selectedRegionId,
  onPlaceClick,
  onRegionClick,
}: QuizMapProps) {
  // Default center (will be overridden by FitBounds)
  const defaultCenter: LatLngTuple = [20, 0];
  const defaultZoom = 2;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds places={places} regions={regions} />

      {/* Render places as markers */}
      {places?.map((place) => (
        <PlaceMarker
          key={place._id}
          place={place}
          onClick={() => onPlaceClick?.(place)}
        />
      ))}

      {/* Render regions as polygons */}
      {regions?.map((region) => (
        <RegionPolygon
          key={region._id}
          area={region}
          isSelected={region._id === selectedRegionId}
          onClick={() => onRegionClick?.(region)}
        />
      ))}
    </MapContainer>
  );
}
