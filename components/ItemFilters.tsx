"use client";

export type Filters = {
  q: string;
  category: string;
  location: string;
  type: "all" | "lost" | "found";
  from: string;
  to: string;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  category: "",
  location: "",
  type: "all",
  from: "",
  to: "",
};

export const hasActiveFilters = (f: Filters) =>
  Boolean(f.q || f.category || f.location || f.from || f.to || f.type !== "all");

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
const labelClass = "mb-1 block text-xs font-semibold text-gray-600";

const TYPES: { value: Filters["type"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
];

const ItemFilters = ({ value, onChange }: Props) => {
  const set = <K extends keyof Filters>(key: K, next: Filters[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="mb-10 rounded-3xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="f-q" className={labelClass}>
            Search item name
          </label>
          <input
            id="f-q"
            type="text"
            value={value.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="e.g. wallet, phone, keys"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-category" className={labelClass}>
            Category
          </label>
          <select
            id="f-category"
            value={value.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            <option value="">All categories</option>
            <option value="wallet">Wallet / Purse</option>
            <option value="electronics">Phone / Electronics</option>
            <option value="bag">Bag / Luggage</option>
            <option value="keys">Keys</option>
            <option value="documents">Documents / ID Card</option>
            <option value="jewelry">Jewelry / Watch</option>
            <option value="pet">Pet</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="f-location" className={labelClass}>
            Location
          </label>
          <input
            id="f-location"
            type="text"
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. GEC Circle"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-from" className={labelClass}>
            Date from
          </label>
          <input
            id="f-from"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => set("from", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-to" className={labelClass}>
            Date to
          </label>
          <input
            id="f-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => set("to", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <span className={labelClass}>Type</span>
          <div className="inline-flex rounded-xl border border-gray-300 bg-white p-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("type", t.value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                  value.type === t.value
                    ? t.value === "lost"
                      ? "bg-red-600 text-white"
                      : t.value === "found"
                      ? "bg-green-600 text-white"
                      : "bg-amber-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasActiveFilters(value) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="mt-4 text-sm font-semibold text-red-600 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
};

export default ItemFilters;