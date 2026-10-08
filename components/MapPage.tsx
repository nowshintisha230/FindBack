"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { MapItem } from "./map/MapOverview";

const MapOverview = dynamic(() => import("./map/MapOverview"), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full animate-pulse bg-amber-100" />,
});

type ApiItem = {
  id: string;
  name: string;
  place: string;
  latitude: number | null;
  longitude: number | null;
};

type Filter = "all" | "lost" | "found";

const MapPage = () => {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/items", { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data: { lost: ApiItem[]; found: ApiItem[] } = await res.json();
        if (!active) return;

        const toMap = (list: ApiItem[], type: "lost" | "found"): MapItem[] =>
          list
            .filter((i) => i.latitude !== null && i.longitude !== null)
            .map((i) => ({
              id: i.id,
              type,
              name: i.name,
              place: i.place,
              lat: i.latitude as number,
              lng: i.longitude as number,
            }));

        setItems([...toMap(data.lost, "lost"), ...toMap(data.found, "found")]);
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter]
  );

  const options: { value: Filter; label: string; active: string }[] = [
    { value: "all", label: "All", active: "bg-amber-600 text-white" },
    { value: "lost", label: "Lost", active: "bg-red-600 text-white" },
    { value: "found", label: "Found", active: "bg-green-600 text-white" },
  ];

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Map View</h1>
            <p className="mt-2 text-gray-600">
              {loading
                ? "Loading pins..."
                : `${visible.length} item${visible.length === 1 ? "" : "s"} with a pinned location.`}
            </p>
          </div>

          <div className="inline-flex self-start rounded-xl border border-gray-300 bg-white p-1">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFilter(o.value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                  filter === o.value ? o.active : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-xl">
          <MapOverview items={visible} />
        </div>

        {!loading && items.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-600">
            No items have a pinned location yet. Pin a location when you report an item.
          </p>
        )}
      </div>
    </section>
  );
};

export default MapPage;