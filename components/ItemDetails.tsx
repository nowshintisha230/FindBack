"use client";

import SaveButton from "./SaveButton";
import { savedKey, useSavedItems } from "@/lib/useSavedItems";
import ChatButton from "./ChatButton";
import ClaimSection from "./ClaimSection";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import dynamic from "next/dynamic";

const LocationView = dynamic(() => import("./map/LocationView"), {
  ssr: false,
  loading: () => <div className="h-60 w-full animate-pulse rounded-xl bg-amber-100" />,
});

type Detail = {
  id: string;
  type: "lost" | "found";
  name: string;
  category: string;
  description: string;
  location: string;
  date: string;
  reportedAt: string;
  reward: string;
  images: string[];
  poster: { name: string; photo: string };
  status: "open" | "returned";
  latitude: number | null;
  longitude: number | null;
  returnedAt: string | null;
  isOwner: boolean;
  contact: { phone: string; email: string } | null;
};

type ViewState = "loading" | "ready" | "notfound" | "error";

const CATEGORY_LABELS: Record<string, string> = {
  wallet: "Wallet / Purse",
  electronics: "Phone / Electronics",
  bag: "Bag / Luggage",
  keys: "Keys",
  documents: "Documents / ID Card",
  jewelry: "Jewelry / Watch",
  pet: "Pet",
  clothing: "Clothing",
  other: "Other",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const toWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const Avatar = ({
  name,
  photo,
  size,
}: {
  name: string;
  photo: string;
  size: "sm" | "lg";
}) => {
  const [broken, setBroken] = useState(false);
  const dim = size === "sm" ? "h-9 w-9 text-xs" : "h-16 w-16 text-xl";

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={name || "Poster"}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${dim} shrink-0 rounded-full border-2 border-amber-200 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 font-bold text-white`}
    >
      {getInitials(name)}
    </div>
  );
};

const Skeleton = () => (
  <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-6 h-5 w-32 rounded bg-amber-200/70" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="mx-auto aspect-[4/3] w-full max-w-xs rounded-2xl bg-amber-200/60 sm:max-w-sm lg:mx-0" />
        <div className="space-y-4">
          <div className="h-6 w-24 rounded-full bg-amber-200/70" />
          <div className="h-10 w-3/4 rounded bg-amber-200/70" />
          <div className="h-28 rounded-2xl bg-amber-200/60" />
          <div className="h-40 rounded-2xl bg-amber-200/60" />
        </div>
      </div>
    </div>
  </section>
);

const Message = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => (
  <section className="flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-16">
    <div className="max-w-md rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-xl">
      <div className="text-5xl">🔎</div>
      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{text}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-700"
      >
        Back to Home
      </Link>
    </div>
  </section>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl bg-amber-50/60 px-4 py-3">
    <span className="text-xl leading-6">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 break-words font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const ItemDetails = ({ type, id }: { type: "lost" | "found"; id: string }) => {
  const [state, setState] = useState<ViewState>("loading");
  const [item, setItem] = useState<Detail | null>(null);
  const [updating, setUpdating] = useState(false);

  const { saved, toggle } = useSavedItems();

  const isLost = type === "lost";

  const toggleReturned = async () => {
    if (!item) return;
    const user = auth.currentUser;
    if (!user) return;

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/items/${type}/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returned: item.status !== "returned" }),
      });
      if (res.ok) {
        const data = await res.json();
        setItem({ ...item, status: data.status, returnedAt: data.returnedAt });
      }
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    let alive = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        const headers: HeadersInit = {};
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

        const res = await fetch(`/api/items/${type}/${id}`, {
          headers,
          cache: "no-store",
        });

        if (!alive) return;

        if (res.status === 404) {
          setState("notfound");
          return;
        }
        if (!res.ok) throw new Error("Request failed");

        setItem(await res.json());
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [type, id]);

  if (state === "loading") return <Skeleton />;

  if (state === "notfound") {
    return (
      <Message
        title="Post not found"
        text="This post may have been removed or the link is incorrect."
      />
    );
  }

  if (state === "error" || !item) {
    return (
      <Message
        title="Something went wrong"
        text="We could not load this post. Please try again in a moment."
      />
    );
  }

  const accent = isLost
    ? {
        badge: "bg-red-600",
        soft: "bg-red-50 border-red-100 text-red-700",
        button: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
      }
    : {
        badge: "bg-green-600",
        soft: "bg-green-50 border-green-100 text-green-700",
        button: "bg-green-600 hover:bg-green-700 shadow-green-600/20",
      };

  const hasImages = item.images.length > 0;
  const needsScroll = item.images.length > 3;
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
  const returned = item.status === "returned";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-orange-300/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:text-amber-950"
        >
          <span>←</span> Back to all items
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
          <div className="mx-auto w-full max-w-xs sm:max-w-sm lg:mx-0">
            <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-xl">
              <span
                className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow ${
                  returned ? "bg-gray-700" : accent.badge
                }`}
              >
                {returned ? "Returned" : isLost ? "Lost" : "Found"}
              </span>

              {hasImages ? (
                <div
                  className={`space-y-2 bg-amber-50/60 p-2 ${
                    needsScroll
                      ? "max-h-[420px] overflow-y-auto [scrollbar-width:thin]"
                      : ""
                  }`}
                >
                  {item.images.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt={`${item.name} photo ${index + 1}`}
                      className="w-full rounded-xl bg-white object-contain"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-amber-300">
                  <span className="text-5xl">📦</span>
                  <span className="mt-2 text-sm font-semibold text-amber-700">
                    No photo provided
                  </span>
                </div>
              )}
            </div>

            {needsScroll && (
              <p className="mt-2 text-center text-xs font-medium text-gray-500">
                {item.images.length} photos · scroll to see all
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${accent.soft}`}
                >
                  {isLost ? "Lost item" : "Found item"}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {categoryLabel}
                </span>
                {returned && (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    ✓ Returned
                  </span>
                )}
                {item.isOwner && (
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                    Your post
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl">
                {item.name}
              </h1>

              <div className="mt-3 flex items-center gap-2.5">
                <Avatar
                  name={item.poster.name}
                  photo={item.poster.photo}
                  size="sm"
                />
                <p className="min-w-0 truncate text-sm text-gray-600">
                  Posted by{" "}
                  <span className="font-semibold text-gray-900">
                    {item.poster.name || "FindBack member"}
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <SaveButton
                  variant="full"
                  isSaved={saved.has(savedKey(type, item.id))}
                  onToggle={() => toggle(type, item.id)}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow
                  icon="📅"
                  label={isLost ? "Lost on" : "Found on"}
                  value={formatDate(item.date)}
                />
                <InfoRow
                  icon="🕒"
                  label="Reported on"
                  value={formatDateTime(item.reportedAt)}
                />
                <div className="sm:col-span-2">
                  <InfoRow
                    icon="📍"
                    label={isLost ? "Lost at" : "Found at"}
                    value={item.location}
                  />
                </div>
                {item.reward && (
                  <div className="sm:col-span-2">
                    <InfoRow icon="🎁" label="Reward" value={item.reward} />
                  </div>
                )}
              </div>

              {item.latitude !== null && item.longitude !== null && (
                <div className="mt-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Map
                  </h2>
                  <div className="mt-2">
                    <LocationView
                      lat={item.latitude}
                      lng={item.longitude}
                      type={type}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-amber-700 hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              )}

              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Description
                </h2>
                <p className="mt-2 whitespace-pre-line leading-7 text-gray-700">
                  {item.description || "No description provided."}
                </p>
              </div>

              {item.isOwner && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm text-gray-700">
                    {returned
                      ? `Marked as returned${
                          item.returnedAt
                            ? ` on ${formatDate(item.returnedAt)}`
                            : ""
                        }.`
                      : isLost
                      ? "Got your item back? Mark this post as returned."
                      : "Handed this item to its owner? Mark this post as returned."}
                  </p>
                  <button
                    type="button"
                    onClick={toggleReturned}
                    disabled={updating}
                    className={`mt-3 rounded-xl px-5 py-2.5 text-sm font-semibold shadow transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      returned
                        ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {updating
                      ? "Saving..."
                      : returned
                      ? "Undo: mark as not returned"
                      : "Mark as returned"}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl sm:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Posted by
              </h2>

              <div className="mt-4 flex items-center gap-4">
                <Avatar
                  name={item.poster.name}
                  photo={item.poster.photo}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-gray-900">
                    {item.poster.name || "FindBack member"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Posted on {formatDate(item.reportedAt)}
                  </p>
                </div>
              </div>

              {item.contact ? (
                <div className="mt-6 space-y-3">
                  <InfoRow icon="📞" label="Phone" value={item.contact.phone} />
                  {item.contact.email && (
                    <InfoRow icon="✉️" label="Email" value={item.contact.email} />
                  )}

                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    <a
                      href={`tel:${item.contact.phone}`}
                      className={`rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 ${accent.button}`}
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${toWhatsApp(item.contact.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                    >
                      WhatsApp
                    </a>
                    {item.contact.email && (
                      <a
                        href={`mailto:${item.contact.email}?subject=${encodeURIComponent(
                          `About your ${isLost ? "lost" : "found"} item: ${item.name}`
                        )}`}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
                  <div className="text-3xl">🔒</div>
                  <p className="mt-2 font-semibold text-gray-900">
                    Sign in to see contact details
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Phone number and email are visible to signed-in members only.
                  </p>
                  <Link
                    href="/SignInForm"
                    className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>

            {!isLost && (
              <>
                <ChatButton
                  type={type}
                  id={item.id}
                  itemName={item.name}
                  isOwner={item.isOwner}
                />
                <ClaimSection
                  id={item.id}
                  isOwner={item.isOwner}
                  returned={returned}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ItemDetails;