"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";

const REASONS: { value: string; label: string }[] = [
  { value: "fake", label: "Fake or fraudulent post" },
  { value: "scam", label: "Scam or asking for money" },
  { value: "incorrect", label: "Incorrect information" },
  { value: "spam", label: "Spam or duplicate post" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

const ReportButton = ({
  type,
  id,
  isOwner,
}: {
  type: "lost" | "found";
  id: string;
  isOwner: boolean;
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [reported, setReported] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const checkReported = useCallback(
    async (u: User) => {
      try {
        const token = await u.getIdToken();
        const res = await fetch(`/api/reports?type=${type}&itemId=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data: { reported: boolean } = await res.json();
          setReported(data.reported);
        }
      } catch {}
    },
    [type, id]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (u) checkReported(u);
      else setReported(false);
    });
    return unsubscribe;
  }, [checkReported]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isOwner || !ready) return null;

  const openModal = () => {
    if (!user) {
      router.push("/SignInForm");
      return;
    }
    setError("");
    setDone(false);
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError("");
    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, itemId: id, reason, details }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 409) {
        setReported(true);
        setOpen(false);
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      setReported(true);
      setDone(true);
      setReason("");
      setDetails("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {reported && !open ? (
        <p className="text-center text-sm font-medium text-gray-500">
          🚩 You reported this post. Thank you.
        </p>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="mx-auto block text-sm font-semibold text-gray-500 transition hover:text-red-600 hover:underline"
        >
          🚩 Report this post
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <div className="text-5xl">✅</div>
                <h2 className="mt-3 text-xl font-extrabold text-gray-900">Report sent</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Thank you for helping keep FindBack safe. Our team will review this post.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Report this post</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Tell us what is wrong. Your report is private.
                  </p>
                </div>

                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        reason === r.value
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-red-600"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="report-details"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    More details {reason === "other" ? "" : "(optional)"}
                  </label>
                  <textarea
                    id="report-details"
                    rows={3}
                    maxLength={500}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Anything that helps us understand the problem..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting || !reason}
                    className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;