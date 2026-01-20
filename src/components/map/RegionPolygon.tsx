import { Polygon, Popup } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import type {
  Feature,
  Polygon as GeoPolygon,
  MultiPolygon,
  Position,
} from "geojson";
import type { AreaWithGeometry } from "../../lib/types";

interface RegionPolygonProps {
  area: AreaWithGeometry;
  onClick?: () => void;
  isSelected?: boolean;
}

// Convert GeoJSON coordinates to Leaflet format
// GeoJSON: [lng, lat], Leaflet: [lat, lng]
function convertCoordinates(coords: Position[]): LatLngTuple[] {
  return coords.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}

export function RegionPolygon({ area, onClick, isSelected }: RegionPolygonProps) {
  if (!area.geojson) return null;

  let geojson: Feature<GeoPolygon | MultiPolygon>;
  try {
    geojson = JSON.parse(area.geojson);
  } catch {
    console.error(`Invalid GeoJSON for area ${area.name}`);
    return null;
  }

  const pathOptions = {
    color: isSelected ? "#2563eb" : "#3b82f6",
    weight: isSelected ? 3 : 2,
    fillColor: isSelected ? "#3b82f6" : "#60a5fa",
    fillOpacity: isSelected ? 0.4 : 0.2,
  };

  const popupContent = (
    <div className="text-sm">
      <strong>{area.name}</strong>
      <br />
      <span className="text-gray-500">{area.adminTypeName}</span>
    </div>
  );

  // Handle MultiPolygon: render multiple Polygon components
  if (geojson.geometry.type === "MultiPolygon") {
    return (
      <>
        {geojson.geometry.coordinates.map((polygonCoords, index) => (
          <Polygon
            key={`${area._id}-${index}`}
            positions={polygonCoords.map(convertCoordinates)}
            pathOptions={pathOptions}
            eventHandlers={{ click: onClick }}
          >
            <Popup>{popupContent}</Popup>
          </Polygon>
        ))}
      </>
    );
  }

  // Handle simple Polygon
  return (
    <Polygon
      positions={geojson.geometry.coordinates.map(convertCoordinates)}
      pathOptions={pathOptions}
      eventHandlers={{ click: onClick }}
    >
      <Popup>{popupContent}</Popup>
    </Polygon>
  );
}
