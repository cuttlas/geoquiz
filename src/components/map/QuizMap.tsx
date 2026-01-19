import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { LatLngBounds, type LatLngTuple } from "leaflet";
import { useEffect } from "react";
import { PlaceMarker } from "./PlaceMarker";
import type { Place } from "../../lib/types";

interface QuizMapProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
}

// Component to auto-fit bounds when places change
function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) return;

    if (places.length === 1) {
      // Single place: center on it with reasonable zoom
      map.setView([places[0].latitude, places[0].longitude], 10);
    } else {
      // Multiple places: fit bounds with padding
      const bounds = new LatLngBounds(
        places.map((p) => [p.latitude, p.longitude] as LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, map]);

  return null;
}

export function QuizMap({ places, onPlaceClick }: QuizMapProps) {
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
      <FitBounds places={places} />
      {places.map((place) => (
        <PlaceMarker
          key={place._id}
          place={place}
          onClick={() => onPlaceClick?.(place)}
        />
      ))}
    </MapContainer>
  );
}
