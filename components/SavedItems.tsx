"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import { Item, ItemCard } from "./Itemssection";

type SavedEntry = Item & { type: "lost" | "found" };

const SavedItems = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User) => {
    try {
      const token = await u.getIdToken();
      const res = await fetch("/api/saved?details=1", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data: { items: SavedEntry[] } = await res.json();
        setItems(data.items);
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

  const remove = async (entry: SavedEntry) => {
    const u = auth.currentUser;
    if (!u) return "auth" as const;

    try {
      const token = await u.getIdToken();
      const res = await fetch(
        `/api/saved?type=${entry.type}&itemId=${encodeURIComponent(entry.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Request failed");
      setItems((prev) => prev.filter((i) => !(i.id === entry.id && i.type === entry.type)));
      return "removed" as const;
    } catch {
      return "error" as const;
    }
  };

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Saved Posts</h1>
        <p className="mt-2 text-gray-600">Posts you bookmarked to check later.</p>

        <div className="mt-8">
          {!authReady || loading ? (
            <p className="py-12 text-center text-gray-500">Loading...</p>
          ) : !user ? (
            <div className="rounded-3xl border border-amber-100 bg-white px-6 py-12 text-center shadow-xl">
              <div className="text-4xl">🔒</div>
              <p className="mt-3 font-semibold text-gray-900">Sign in to see your saved posts</p>
              <Link
                href="/SignInForm"
                className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Sign in
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-amber-100 bg-white px-6 py-12 text-center shadow-xl">
              <div className="text-4xl">♡</div>
              <p className="mt-3 font-semibold text-gray-900">Nothing saved yet</p>
              <p className="mt-1 text-sm text-gray-600">
                Tap the heart on any post to save it here.
              </p>
              <Link
                href="/all-items"
                className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Browse items
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((entry) => (
                <ItemCard
                  key={`${entry.type}-${entry.id}`}
                  item={entry}
                  type={entry.type}
                  isSaved
                  onToggleSave={() => remove(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SavedItems;