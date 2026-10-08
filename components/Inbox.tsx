"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import UserAvatar from "./UserAvatar";

type Convo = {
  id: string;
  itemType: "lost" | "found";
  itemId: string;
  itemName: string;
  otherName: string;
  otherPhoto: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const Inbox = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User) => {
    try {
      const token = await u.getIdToken();
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data: { conversations: Convo[] } = await res.json();
        setConvos(data.conversations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    load(user);
    const timer = setInterval(() => load(user), 10000);
    return () => clearInterval(timer);
  }, [user, load]);

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Messages</h1>
        <p className="mt-2 text-gray-600">Your conversations with finders and owners.</p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-xl">
          {!authReady || loading ? (
            <p className="px-6 py-12 text-center text-gray-500">Loading...</p>
          ) : !user ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl">🔒</div>
              <p className="mt-3 font-semibold text-gray-900">Sign in to see your messages</p>
              <Link
                href="/SignInForm"
                className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Sign in
              </Link>
            </div>
          ) : convos.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl">💬</div>
              <p className="mt-3 font-semibold text-gray-900">No conversations yet</p>
              <p className="mt-1 text-sm text-gray-600">
                Open any post and tap the message button to start a chat.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-amber-100">
              {convos.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition hover:bg-amber-50/60 sm:px-6"
                  >
                    <UserAvatar name={c.otherName} photo={c.otherPhoto} className="h-12 w-12 text-base" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`truncate ${
                            c.unread ? "font-extrabold text-gray-900" : "font-bold text-gray-800"
                          }`}
                        >
                          {c.otherName || "FindBack member"}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatTime(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
                            c.itemType === "lost" ? "bg-red-600" : "bg-green-600"
                          }`}
                        >
                          {c.itemType}
                        </span>
                        <span className="truncate">{c.itemName}</span>
                      </p>
                      <p
                        className={`mt-1 truncate text-sm ${
                          c.unread ? "font-semibold text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {c.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {c.unread && (
                      <span className="h-3 w-3 shrink-0 rounded-full bg-red-600" aria-label="Unread" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default Inbox;