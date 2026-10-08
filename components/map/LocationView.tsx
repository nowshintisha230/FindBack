"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { dotIcon } from "./pin";

const LocationView = ({
  lat,
  lng,
  type,
}: {
  lat: number;
  lng: number;
  type: "lost" | "found";
}) => (
  <div className="overflow-hidden rounded-xl border border-amber-200">
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      className="z-0 h-60 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={dotIcon(type === "lost" ? "#dc2626" : "#16a34a")} />
    </MapContainer>
  </div>
);

export default LocationView;