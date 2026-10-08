"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";

type OwnerClaim = {
  id: string;
  claimerName: string;
  claimerEmail: string;
  claimerPhoto: string;
  phone: string;
  proof: string;
  status: string;
  createdAt: string;
};

type ClaimData =
  | { role: "owner"; claims: OwnerClaim[] }
  | { role: "claimer"; myClaim: { status: string; createdAt: string } | null };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
      STATUS_STYLE[status] || STATUS_STYLE.pending
    }`}
  >
    {status}
  </span>
);

const ClaimAvatar = ({ name, photo }: { name: string; photo: string }) => {
  const [broken, setBroken] = useState(false);

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-10 w-10 shrink-0 rounded-full border-2 border-amber-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white">
      {(name.trim()[0] || "?").toUpperCase()}
    </div>
  );
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

const ClaimSection = ({
  id,
  isOwner,
  returned,
}: {
  id: string;
  isOwner: boolean;
  returned: boolean;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(
    async (u: User) => {
      try {
        const token = await u.getIdToken();
        const res = await fetch(`/api/items/found/${id}/claims`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        load(u);
      } else {
        setData(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/items/found/${id}/claims`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proof, phone }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Something went wrong. Please try again.");
        return;
      }

      setProof("");
      setPhone("");
      await load(user);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (claimId: string, action: "approve" | "reject") => {
    if (!user) return;

    if (
      action === "approve" &&
      !window.confirm("Approve this claim? The item will be marked as returned.")
    ) {
      return;
    }

    setBusyId(claimId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/items/found/${id}/claims/${claimId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok && action === "approve") {
        window.location.reload();
        return;
      }

      await load(user);
    } finally {
      setBusyId("");
    }
  };

  if (!authReady) return null;

  const shell = (children: React.ReactNode) => (
    <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl sm:p-8">
      {children}
    </div>
  );

  if (!user) {
    return shell(
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-gray-900">Is this your item?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Sign in to claim this item and send verification details to the finder.
        </p>
        <Link
          href="/SignInForm"
          className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Sign in to claim
        </Link>
      </div>
    );
  }

  if (loading) {
    return shell(<p className="text-sm text-gray-500">Loading claims...</p>);
  }

  if (isOwner || data?.role === "owner") {
    const claims = data?.role === "owner" ? data.claims : [];

    return shell(
      <>
        <h2 className="text-lg font-extrabold text-gray-900">
          Claims on your post ({claims.length})
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Check the proof carefully before approving. Approving marks the item as returned.
        </p>

        {claims.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No one has claimed this item yet.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {claims.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClaimAvatar name={c.claimerName} photo={c.claimerPhoto} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">
                        {c.claimerName || "FindBack member"}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(c.createdAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Proof of ownership
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-800">
                  {c.proof}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
                  <a href={`tel:${c.phone}`} className="font-semibold hover:underline">
                    📞 {c.phone}
                  </a>
                  {c.claimerEmail && (
                    <a
                      href={`mailto:${c.claimerEmail}`}
                      className="font-semibold hover:underline"
                    >
                      ✉️ {c.claimerEmail}
                    </a>
                  )}
                </div>

                {c.status === "pending" && !returned && (
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => review(c.id, "approve")}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => review(c.id, "reject")}
                      className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const myClaim = data?.role === "claimer" ? data.myClaim : null;

  if (myClaim) {
    return shell(
      <>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-gray-900">Your claim</h2>
          <StatusBadge status={myClaim.status} />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {myClaim.status === "pending" &&
            "The finder has been given your details and will review your claim."}
          {myClaim.status === "approved" &&
            "Your claim was approved. The finder will contact you to hand over the item."}
          {myClaim.status === "rejected" &&
            "Your claim was not accepted by the finder."}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Submitted on {formatDateTime(myClaim.createdAt)}
        </p>
      </>
    );
  }

  if (returned) {
    return shell(
      <p className="text-center text-sm font-semibold text-gray-700">
        This item has already been returned to its owner.
      </p>
    );
  }

  return shell(
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">Is this your item?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tell the finder something only the real owner would know, such as color,
          brand, marks, what was inside, lock screen or serial number.
        </p>
      </div>

      <div>
        <label htmlFor="proof" className="mb-1.5 block text-sm font-semibold text-gray-700">
          Verification details <span className="text-red-600">*</span>
        </label>
        <textarea
          id="proof"
          rows={4}
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="e.g. Black wallet with a small tear near the zip, contains a student ID and 2 bKash cards..."
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="claim-phone" className="mb-1.5 block text-sm font-semibold text-gray-700">
          Your contact number <span className="text-red-600">*</span>
        </label>
        <input
          id="claim-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          required
          className={inputClass}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-green-600/20 transition hover:-translate-y-0.5 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {submitting ? "Sending..." : "Claim this item"}
      </button>
    </form>
  );
};

export default ClaimSection;