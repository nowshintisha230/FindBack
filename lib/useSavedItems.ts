"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/Firebase";

export type SaveResult = "saved" | "removed" | "auth" | "error";

export const savedKey = (type: "lost" | "found", id: string) => `${type}:${id}`;

export const useSavedItems = () => {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setSaved(new Set());
        setReady(true);
        return;
      }

      try {
        const token = await u.getIdToken();
        const res = await fetch("/api/saved", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data: { keys: string[] } = await res.json();
          setSaved(new Set(data.keys));
        }
      } catch {
      } finally {
        setReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const toggle = useCallback(
    async (type: "lost" | "found", id: string): Promise<SaveResult> => {
      const user = auth.currentUser;
      if (!user) return "auth";

      const key = savedKey(type, id);
      const wasSaved = saved.has(key);

      setSaved((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        const token = await user.getIdToken();
        const res = wasSaved
          ? await fetch(`/api/saved?type=${type}&itemId=${encodeURIComponent(id)}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            })
          : await fetch("/api/saved", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ type, itemId: id }),
            });

        if (!res.ok) throw new Error("Request failed");
        return wasSaved ? "removed" : "saved";
      } catch {
        setSaved((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(key);
          else next.delete(key);
          return next;
        });
        return "error";
      }
    },
    [saved]
  );

  return { saved, ready, toggle };
};