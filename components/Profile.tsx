"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import { Item, ItemCard } from "./Itemssection";
import UserAvatar from "./UserAvatar";

type Entry = Item & { type: "lost" | "found" };

type SavedEntry = Entry;

type ClaimRow = {
  id: string;
  itemId: string;
  status: string;
  createdAt: string;
  item: { name: string; place: string; image: string; status: string } | null;
};

type MeData = {
  profile: { name: string; email: string; photo: string };
  lost: Item[];
  found: Item[];
  claims: ClaimRow[];
  stats: { pendingClaims: number };
};

type Tab = "lost" | "found" | "claims" | "returned" | "saved";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Empty = ({
  icon,
  title,
  text,
  href,
  cta,
}: {
  icon: string;
  title: string;
  text: string;
  href?: string;
  cta?: string;
}) => (
  <div className="rounded-3xl border border-amber-100 bg-white px-6 py-12 text-center shadow-xl">
    <div className="text-4xl">{icon}</div>
    <p className="mt-3 font-semibold text-gray-900">{title}</p>
    <p className="mt-1 text-sm text-gray-600">{text}</p>
    {href && cta && (
      <Link
        href={href}
        className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
      >
        {cta}
      </Link>
    )}
  </div>
);

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("lost");

  const load = useCallback(async (u: User) => {
    try {
      const token = await u.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [meRes, savedRes] = await Promise.all([
        fetch("/api/me", { headers, cache: "no-store" }),
        fetch("/api/saved?details=1", { headers, cache: "no-store" }),
      ]);

      if (meRes.ok) setMe(await meRes.json());
      if (savedRes.ok) {
        const data: { items: SavedEntry[] } = await savedRes.json();
        setSaved(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) load(u);
      else setLoading(false);
    });
    return unsubscribe;
  }, [load]);

  const lostEntries = useMemo<Entry[]>(
    () => (me ? me.lost.map((i) => ({ ...i, type: "lost" as const })) : []),
    [me]
  );
  const foundEntries = useMemo<Entry[]>(
    () => (me ? me.found.map((i) => ({ ...i, type: "found" as const })) : []),
    [me]
  );
  const returnedEntries = useMemo<Entry[]>(
    () =>
      [...lostEntries, ...foundEntries]
        .filter((i) => i.status === "returned")
        .sort(
          (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
        ),
    [lostEntries, foundEntries]
  );

  const removeSaved = async (entry: SavedEntry) => {
    const u = auth.currentUser;
    if (!u) return "auth" as const;

    try {
      const token = await u.getIdToken();
      const res = await fetch(
        `/api/saved?type=${entry.type}&itemId=${encodeURIComponent(entry.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Request failed");
      setSaved((prev) => prev.filter((i) => !(i.id === entry.id && i.type === entry.type)));
      return "removed" as const;
    } catch {
      return "error" as const;
    }
  };

  const wrap = (children: React.ReactNode) => (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );

  if (!authReady || loading) {
    return wrap(<p className="py-12 text-center text-gray-500">Loading...</p>);
  }

  if (!user || !me) {
    return wrap(
      <div className="mx-auto max-w-md rounded-3xl border border-amber-100 bg-white px-6 py-12 text-center shadow-xl">
        <div className="text-4xl">🔒</div>
        <p className="mt-3 font-semibold text-gray-900">Sign in to see your profile</p>
        <Link
          href="/SignInForm"
          className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "lost", label: "My Lost Items", count: lostEntries.length },
    { value: "found", label: "My Found Items", count: foundEntries.length },
    { value: "claims", label: "My Claims", count: me.claims.length },
    { value: "returned", label: "Returned", count: returnedEntries.length },
    { value: "saved", label: "Saved", count: saved.length },
  ];

  const renderGrid = (list: Entry[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((entry) => (
        <ItemCard key={`${entry.type}-${entry.id}`} item={entry} type={entry.type} />
      ))}
    </div>
  );

  return wrap(
    <>
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-amber-100 bg-white p-6 shadow-xl sm:flex-row sm:p-8">
        <UserAvatar
          name={me.profile.name}
          photo={me.profile.photo}
          className="h-20 w-20 text-2xl"
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="truncate text-2xl font-extrabold text-gray-900 sm:text-3xl">
            {me.profile.name || "FindBack member"}
          </h1>
          <p className="mt-1 truncate text-sm text-gray-600">{me.profile.email}</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-red-700">{lostEntries.length}</p>
            <p className="text-xs font-semibold text-red-700/80">Lost</p>
          </div>
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-green-700">{foundEntries.length}</p>
            <p className="text-xs font-semibold text-green-700/80">Found</p>
          </div>
          <div className="rounded-2xl bg-gray-100 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-gray-700">{returnedEntries.length}</p>
            <p className="text-xs font-semibold text-gray-600">Returned</p>
          </div>
        </div>
      </div>

      {me.stats.pendingClaims > 0 && (
        <button
          type="button"
          onClick={() => setTab("found")}
          className="mt-4 w-full rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-left text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          🔔 You have {me.stats.pendingClaims} pending claim
          {me.stats.pendingClaims === 1 ? "" : "s"} to review on your found posts.
        </button>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.value
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                : "border border-amber-200 bg-white text-gray-700 hover:bg-amber-50"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                tab === t.value ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "lost" &&
          (lostEntries.length === 0 ? (
            <Empty
              icon="🔍"
              title="No lost items reported"
              text="When you report something you lost, it will show up here."
              href="/lost-item"
              cta="Report a lost item"
            />
          ) : (
            renderGrid(lostEntries)
          ))}

        {tab === "found" &&
          (foundEntries.length === 0 ? (
            <Empty
              icon="✓"
              title="No found items reported"
              text="When you report something you found, it will show up here."
              href="/found-item"
              cta="Report a found item"
            />
          ) : (
            renderGrid(foundEntries)
          ))}

        {tab === "returned" &&
          (returnedEntries.length === 0 ? (
            <Empty
              icon="🤝"
              title="Nothing returned yet"
              text="Posts you mark as returned will be listed here."
            />
          ) : (
            renderGrid(returnedEntries)
          ))}

        {tab === "claims" &&
          (me.claims.length === 0 ? (
            <Empty
              icon="📝"
              title="No claims yet"
              text="Think a found item is yours? Open it and send a claim."
              href="/all-items"
              cta="Browse items"
            />
          ) : (
            <div className="space-y-3">
              {me.claims.map((c) => (
                <Link
                  key={c.id}
                  href={`/found-item/${c.itemId}`}
                  className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {c.item?.image ? (
                    <img
                      src={c.item.image}
                      alt={c.item.name}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-900">
                      {c.item?.name || "Post removed"}
                    </p>
                    {c.item && (
                      <p className="truncate text-xs text-gray-600">📍 {c.item.place}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Claimed on {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      STATUS_STYLE[c.status] || STATUS_STYLE.pending
                    }`}
                  >
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          ))}

        {tab === "saved" &&
          (saved.length === 0 ? (
            <Empty
              icon="♡"
              title="Nothing saved yet"
              text="Tap the heart on any post to save it here."
              href="/all-items"
              cta="Browse items"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((entry) => (
                <ItemCard
                  key={`${entry.type}-${entry.id}`}
                  item={entry}
                  type={entry.type}
                  isSaved
                  onToggleSave={() => removeSaved(entry)}
                />
              ))}
            </div>
          ))}
      </div>
    </>
  );
};

export default Profile;