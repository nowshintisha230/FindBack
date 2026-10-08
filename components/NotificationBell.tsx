"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
};

const ICONS: Record<string, string> = {
  message: "💬",
  claim: "📝",
  claim_result: "✅",
  match: "🎯",
};

const timeAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const NotificationBell = () => {
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const authFetch = useCallback(async (u: User, url: string, init?: RequestInit) => {
    const token = await u.getIdToken();
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }, []);

  const loadCount = useCallback(
    async (u: User) => {
      try {
        const res = await authFetch(u, "/api/notifications?count=1");
        if (res.ok) {
          const data: { unread: number } = await res.json();
          setUnread(data.unread);
        }
      } catch {}
    },
    [authFetch]
  );

  const loadList = useCallback(
    async (u: User) => {
      setLoading(true);
      try {
        const res = await authFetch(u, "/api/notifications");
        if (res.ok) {
          const data: { unread: number; notifications: Notif[] } = await res.json();
          setUnread(data.unread);
          setItems(data.notifications);
        }
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUnread(0);
        setItems([]);
        setOpen(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCount(user);
    const timer = setInterval(() => loadCount(user), 20000);
    return () => clearInterval(timer);
  }, [user, loadCount]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList(user);
  };

  const markRead = async (n: Notif) => {
    setOpen(false);
    if (n.read) return;

    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
    setUnread((prev) => Math.max(0, prev - 1));

    try {
      await authFetch(user, "/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: n.id }),
      });
    } catch {}
  };

  const markAll = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);

    try {
      await authFetch(user, "/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ all: true }),
      });
    } catch {}
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-amber-100"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3">
            <p className="font-bold text-gray-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto [scrollbar-width:thin]">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                You have no notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-amber-50">
                {items.map((n) => {
                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 transition hover:bg-amber-50 ${
                        n.read ? "" : "bg-amber-50/70"
                      }`}
                    >
                      <span className="text-xl leading-6">{ICONS[n.type] || "🔔"}</span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-5 text-gray-900 ${
                            n.read ? "font-medium" : "font-bold"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => markRead(n)}>
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n)}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;