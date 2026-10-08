"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import UserAvatar from "./UserAvatar";

type Msg = { id: string; mine: boolean; text: string; createdAt: string };

type Meta = {
  id: string;
  itemType: "lost" | "found";
  itemId: string;
  itemName: string;
  other: { name: string; photo: string };
};

type ViewState = "loading" | "ready" | "forbidden" | "notfound" | "error";

const POLL_MS = 4000;

const formatTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const ChatRoom = ({ id }: { id: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<ViewState>("loading");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastRef = useRef("");
  const boxRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastRef.current = incoming[incoming.length - 1].createdAt;
  }, []);

  const fetchMessages = useCallback(
    async (u: User, initial: boolean) => {
      try {
        const token = await u.getIdToken();
        const qs =
          !initial && lastRef.current
            ? `?after=${encodeURIComponent(lastRef.current)}`
            : "";
        const res = await fetch(`/api/conversations/${id}${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 404) return setState("notfound");
        if (res.status === 403) return setState("forbidden");
        if (!res.ok) throw new Error("Request failed");

        const data: { conversation: Meta; messages: Msg[] } = await res.json();
        setMeta(data.conversation);
        merge(data.messages);
        setState("ready");
      } catch {
        if (initial) setState("error");
      }
    },
    [id, merge]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    lastRef.current = "";
    setMessages([]);
    fetchMessages(user, true);
    const timer = setInterval(() => fetchMessages(user, false), POLL_MS);

    return () => clearInterval(timer);
  }, [user, fetchMessages]);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || sending) return;

    const value = text.trim();
    if (!value) return;

    setError("");
    setSending(true);
    setText("");

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/conversations/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: value }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.message) {
        setError(data?.error || "Message could not be sent.");
        setText(value);
        return;
      }

      merge([data.message]);
    } catch {
      setError("Message could not be sent.");
      setText(value);
    } finally {
      setSending(false);
    }
  };

  const wrap = (children: React.ReactNode) => (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-4 py-8 sm:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );

  if (!authReady) return wrap(<p className="text-gray-600">Loading...</p>);

  if (!user) {
    return wrap(
      <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-xl">
        <div className="text-4xl">🔒</div>
        <p className="mt-3 font-semibold text-gray-900">Sign in to view your messages</p>
        <Link
          href="/SignInForm"
          className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (state === "loading") return wrap(<p className="text-gray-600">Loading chat...</p>);

  if (state !== "ready" || !meta) {
    const text =
      state === "forbidden"
        ? "You are not part of this conversation."
        : state === "notfound"
        ? "This conversation does not exist."
        : "We could not load this chat. Please try again.";

    return wrap(
      <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-xl">
        <p className="font-semibold text-gray-900">{text}</p>
        <Link
          href="/messages"
          className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  const isLost = meta.itemType === "lost";

  return wrap(
    <>
      <Link
        href="/messages"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:text-amber-950"
      >
        <span>←</span> All messages
      </Link>

      <div className="flex h-[70vh] flex-col overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-amber-100 px-4 py-3 sm:px-6">
          <UserAvatar name={meta.other.name} photo={meta.other.photo} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-gray-900">
              {meta.other.name || "FindBack member"}
            </p>
            <Link
              href={`/${meta.itemType}-item/${meta.itemId}`}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:underline"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
                  isLost ? "bg-red-600" : "bg-green-600"
                }`}
              >
                {isLost ? "Lost" : "Found"}
              </span>
              <span className="truncate">{meta.itemName}</span>
            </Link>
          </div>
        </div>

        <div
          ref={boxRef}
          className="flex-1 space-y-3 overflow-y-auto bg-amber-50/30 px-4 py-4 sm:px-6"
        >
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No messages yet. Say hello!
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                      m.mine
                        ? "rounded-br-md bg-amber-600 text-white"
                        : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    {m.text}
                  </div>
                  <p
                    className={`mt-1 text-[10px] text-gray-400 ${
                      m.mine ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 sm:px-6">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 border-t border-amber-100 px-4 py-3 sm:px-6"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Type a message..."
            className="max-h-32 flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatRoom;