"use client";

import { ChangeEvent, useRef, useState } from "react";

const MAX_IMAGES = 5;

const LostItemPage = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const syncFiles = (next: File[]) => {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const merged = [...files];
    picked.forEach((p) => {
      const exists = merged.some(
        (f) =>
          f.name === p.name &&
          f.size === p.size &&
          f.lastModified === p.lastModified
      );
      if (!exists) merged.push(p);
    });
    syncFiles(merged.slice(0, MAX_IMAGES));
  };

  const handleRemoveImage = (index: number) => {
    syncFiles(files.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    syncFiles([]);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  const labelClass = "mb-1.5 block text-sm font-semibold text-gray-700";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-12 sm:px-6 md:py-16">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-red-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-red-200 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-red-700">
            Lost Item Report
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            What did you lose?
          </h1>
          <p className="mt-2 text-gray-600">
            Give us as many details as you can. It helps others identify your
            item faster.
          </p>
        </div>

        <form className="space-y-5 rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl sm:p-8">
          <div>
            <label htmlFor="title" className={labelClass}>
              Item Name <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Black leather wallet"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              Category <span className="text-red-600">*</span>
            </label>
            <select id="category" name="category" required className={inputClass}>
              <option value="">Select a category</option>
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
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Color, brand, size, any marks or unique features..."
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className={labelClass}>
                Where did you lose it? <span className="text-red-600">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g. GEC Circle, Chattogram"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="dateLost" className={labelClass}>
                Date Lost <span className="text-red-600">*</span>
              </label>
              <input
                id="dateLost"
                name="dateLost"
                type="date"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Contact Number <span className="text-red-600">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="reward" className={labelClass}>
                Reward (optional)
              </label>
              <input
                id="reward"
                name="reward"
                type="text"
                placeholder="e.g. 500 BDT"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="images" className="text-sm font-semibold text-gray-700">
                Item Photos (optional)
              </label>
              <span className="text-xs font-medium text-gray-500">
                {files.length}/{MAX_IMAGES}
              </span>
            </div>

            <label
              htmlFor="images"
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                files.length >= MAX_IMAGES
                  ? "cursor-not-allowed border-gray-300 bg-gray-50 opacity-60"
                  : "cursor-pointer border-amber-300 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-50"
              }`}
            >
              <span className="text-3xl">📷</span>
              <span className="mt-2 text-sm font-semibold text-amber-900">
                {files.length === 0
                  ? "Click to upload photos"
                  : files.length >= MAX_IMAGES
                  ? "Maximum photos reached"
                  : "Click to add more photos"}
              </span>
              <span className="mt-1 text-xs text-gray-500">
                PNG, JPG or WEBP. Up to {MAX_IMAGES} photos.
              </span>
              <input
                ref={inputRef}
                id="images"
                name="images"
                type="file"
                accept="image/*"
                multiple
                disabled={files.length >= MAX_IMAGES}
                onChange={handleImageChange}
                className="mt-4 w-full max-w-xs text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-700"
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map((src, index) => (
                    <div
                      key={src}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-amber-200 bg-gray-50 shadow-sm"
                    >
                      <img
                        src={src}
                        alt={`Selected photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        aria-label={`Remove photo ${index + 1}`}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
                      >
                        ✕
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                >
                  Remove all photos
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-red-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:bg-red-700"
            >
              Submit Lost Report
            </button>
            <a
              href="/"
              className="rounded-xl border border-gray-300 px-6 py-3.5 text-center text-base font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </section>
  );
};

export default LostItemPage;