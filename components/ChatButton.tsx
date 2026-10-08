"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";

const ChatButton = ({
  type,
  id,
  itemName,
  isOwner,
}: {
  type: "lost" | "found";
  id: string;
  itemName: string;
  isOwner: boolean;
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsubscribe;
  }, []);

  if (isOwner || !ready) return null;

  const isLost = type === "lost";

  const start = async () => {
    if (!user) return;
    setError("");
    setBusy(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          itemId: id,
          message: isLost
            ? `Hi! I think I found your item "${itemName}". Can we talk?`
            : "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.id) {
        setError(data?.error || "Could not start the chat. Please try again.");
        setBusy(false);
        return;
      }

      router.push(`/messages/${data.id}`);
    } catch {
      setError("Could not start the chat. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl sm:p-8">
      <h2 className="text-lg font-extrabold text-gray-900">
        {isLost ? "Found this item?" : "Talk to the finder"}
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {isLost
          ? "Send a private message to the owner so you can arrange the return."
          : "Send a private message to the finder to ask about this item."}
      </p>

      {user ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-600/20 transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {busy ? "Opening chat..." : isLost ? "💬 I found your item" : "💬 Message the finder"}
        </button>
      ) : (
        <Link
          href="/SignInForm"
          className="mt-4 block w-full rounded-xl bg-amber-600 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-amber-700"
        >
          Sign in to send a message
        </Link>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatButton;