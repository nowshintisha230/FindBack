"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { dotIcon } from "./pin";

export type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [22.3569, 91.7832];

const ClickHandler = ({ onPick }: { onPick: (p: LatLng) => void }) => {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const Focus = ({ target }: { target: LatLng | null }) => {
  const map = useMap();

  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 17);
  }, [target, map]);

  return null;
};

const LocationPicker = ({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (next: LatLng | null) => void;
}) => {
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Your browser does not support location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocating(false);
        setFocus(p);
        onChange(p);
      },
      () => {
        setLocating(false);
        setGeoError("Could not get your location. Please allow location access or click on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-300">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          scrollWheelZoom
          className="z-0 h-72 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={onChange} />
          <Focus target={focus} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={dotIcon("#dc2626")}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  onChange({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="font-semibold text-amber-700 hover:underline disabled:opacity-50"
        >
          {locating ? "Getting location..." : "📍 Use my current location"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-semibold text-red-600 hover:underline"
          >
            Remove pin
          </button>
        )}

        <span className="text-xs text-gray-500">
          {value
            ? `Pinned: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Click on the map to drop a pin."}
        </span>
      </div>

      {geoError && <p className="mt-2 text-sm font-medium text-red-600">{geoError}</p>}
    </div>
  );
};

export default LocationPicker;