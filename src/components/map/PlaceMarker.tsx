import { Marker, Popup } from "react-leaflet";
import { Icon, type LatLngTuple } from "leaflet";
import type { Place } from "../../lib/types";

// Fix for default marker icons in Vite builds
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PlaceMarkerProps {
  place: Place;
  onClick?: () => void;
}

export function PlaceMarker({ place, onClick }: PlaceMarkerProps) {
  const position: LatLngTuple = [place.latitude, place.longitude];

  return (
    <Marker
      position={position}
      icon={defaultIcon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="text-sm">
          <strong>{place.name}</strong>
          <br />
          <span className="text-gray-500 capitalize">{place.featureType}</span>
          {place.population && (
            <>
              <br />
              <span>Pop: {place.population.toLocaleString()}</span>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
