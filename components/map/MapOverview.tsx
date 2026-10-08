"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { dotIcon } from "./pin";

export type MapItem = {
  id: string;
  type: "lost" | "found";
  name: string;
  place: string;
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [22.3569, 91.7832];

const FitBounds = ({ items }: { items: MapItem[] }) => {
  const map = useMap();

  useEffect(() => {
    if (items.length === 0) return;
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(items.map((i) => [i.lat, i.lng] as [number, number])), {
      padding: [40, 40],
    });
  }, [items, map]);

  return null;
};

const MapOverview = ({ items }: { items: MapItem[] }) => (
  <MapContainer center={DEFAULT_CENTER} zoom={12} scrollWheelZoom className="z-0 h-[70vh] w-full">
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <FitBounds items={items} />
    {items.map((item) => (
      <Marker
        key={`${item.type}-${item.id}`}
        position={[item.lat, item.lng]}
        icon={dotIcon(item.type === "lost" ? "#dc2626" : "#16a34a")}
      >
        <Popup>
          <div className="space-y-1">
            <p
              className={`text-xs font-bold uppercase ${
                item.type === "lost" ? "text-red-600" : "text-green-600"
              }`}
            >
              {item.type}
            </p>
            <p className="text-sm font-bold text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-600">📍 {item.place}</p>
            <a
              href={`/${item.type}-item/${item.id}`}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              See details →
            </a>
          </div>
        </Popup>
      </Marker>
    ))}
  </MapContainer>
);

export default MapOverview;