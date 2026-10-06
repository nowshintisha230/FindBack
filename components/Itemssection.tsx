"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ItemFilters, { EMPTY_FILTERS, Filters, hasActiveFilters } from "./ItemFilters";
export type Item = {
  id: string;
  name: string;
  place: string;
  date: string;
  reportedAt: string;
  description: string;
  image?: string;
};

const RECENT_DAYS = 3;
const REFRESH_MS = 30000;

const sortNewestFirst = (items: Item[]) =>
  [...items].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const formatReported = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const ItemCard = ({ item, type }: { item: Item; type: "lost" | "found" }) => {
  const isLost = type === "lost";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-amber-300">
            📦
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow ${
            isLost ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {isLost ? "Lost" : "Found"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <p className="text-[11px] font-medium text-gray-500 sm:text-xs">
          🕒 Reported: {formatReported(item.reportedAt)}
        </p>
        <h3 className="mt-1 text-sm font-bold text-gray-900 sm:text-lg">{item.name}</h3>
        <p className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">
          📅 {isLost ? "Lost on" : "Found on"}: {formatDate(item.date)}
        </p>
        <p className="mt-1 text-xs font-medium text-amber-800 sm:text-sm">📍 {item.place}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600 sm:text-sm sm:leading-6">
          {item.description}
        </p>

        <Link
          href={`/${type}-item/${item.id}`}
          className={`mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold transition sm:text-sm ${
            isLost
              ? "text-red-600 hover:text-red-700"
              : "text-green-600 hover:text-green-700"
          }`}
        >
          See more details
          <span className="transition group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </article>
  );
};

const Column = ({
  title,
  subtitle,
  items,
  type,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: Item[];
  type: "lost" | "found";
  emptyText: string;
}) => {
  const isLost = type === "lost";

  return (
    <div>
      <div
        className={`mb-4 flex items-center gap-2 rounded-2xl border px-3 py-3 sm:mb-5 sm:gap-3 sm:px-5 sm:py-4 ${
          isLost
            ? "border-red-100 bg-red-50"
            : "border-green-100 bg-green-50"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base text-white sm:h-10 sm:w-10 sm:text-lg ${
            isLost ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {isLost ? "🔍" : "✓"}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-gray-900 sm:text-xl">{title}</h2>
          <p className="hidden text-sm text-gray-600 sm:block">{subtitle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white sm:px-3 sm:text-sm ${
            isLost ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-4 py-12 text-center text-sm text-gray-500 sm:px-6 sm:text-base">
          {emptyText}
        </div>
      ) : (
        <div className="max-h-[720px] overflow-y-auto pr-1 [scrollbar-width:thin] sm:pr-2">
          <div className="grid grid-cols-1 gap-3 pb-1 sm:gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} type={type} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ItemsSection = ({ showAll = false }: { showAll?: boolean }) => {
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (showAll) {
          if (filters.q.trim()) params.set("q", filters.q.trim());
          if (filters.category) params.set("category", filters.category);
          if (filters.location.trim()) params.set("location", filters.location.trim());
          if (filters.type !== "all") params.set("type", filters.type);
          if (filters.from) params.set("from", filters.from);
          if (filters.to) params.set("to", filters.to);
        }
        const qs = params.toString();
        const res = await fetch(`/api/items${qs ? `?${qs}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data: { lost: Item[]; found: Item[] } = await res.json();
        if (!active) return;
        setLostItems(data.lost);
        setFoundItems(data.found);
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };

    const delay = showAll ? 300 : 0;
    const first = setTimeout(load, delay);
    const timer = setInterval(load, REFRESH_MS);

    return () => {
      active = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [showAll, filters]);

  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const filterItems = (items: Item[]) =>
    sortNewestFirst(
      showAll
        ? items
        : items.filter((i) => new Date(i.reportedAt).getTime() >= cutoff)
    );

  const visibleLost = filterItems(lostItems);
  const visibleFound = filterItems(foundItems);
  const hasAnyItems = lostItems.length + foundItems.length > 0;
  const filtering = showAll && hasActiveFilters(filters);

  const showLost = !showAll || filters.type !== "found";
  const showFound = !showAll || filters.type !== "lost";
  const singleColumn = showLost !== showFound;

  const emptyFor = (kind: "lost" | "found") => {
    if (loading) return "Loading items...";
    if (filtering) return `No ${kind} items match your filters.`;
    if (showAll || !hasAnyItems) return `No ${kind} items posted yet.`;
    return `No ${kind} items in the last ${RECENT_DAYS} days.`;
  };

  return (
    <section className="bg-white px-4 py-14 sm:px-6 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
            {showAll ? "All Posts" : `Last ${RECENT_DAYS} Days`}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {showAll ? "All Lost & Found Items" : "Latest Lost & Found Items"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            {showAll
              ? "Search and filter every report posted by the community."
              : "Recent reports from the community. Spot something that belongs to you or someone you know? Get in touch."}
          </p>
        </div>

        {showAll && <ItemFilters value={filters} onChange={setFilters} />}

        <div
          className={`grid items-start gap-3 sm:gap-6 lg:gap-10 ${
            singleColumn ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {showLost && (
            <Column
              title="Lost Items"
              subtitle="Things people are looking for"
              items={visibleLost}
              type="lost"
              emptyText={emptyFor("lost")}
            />
          )}
          {showFound && (
            <Column
              title="Found Items"
              subtitle="Things waiting to be returned"
              items={visibleFound}
              type="found"
              emptyText={emptyFor("found")}
            />
          )}
        </div>

        <div className="mt-12 text-center">
          <Link
            href={showAll ? "/" : "/all-items"}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-amber-600/20 transition hover:-translate-y-0.5 hover:bg-amber-700"
          >
            {showAll ? <span>←</span> : null}
            {showAll ? "Back to Home" : "See All Items"}
            {showAll ? null : <span>→</span>}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ItemsSection;