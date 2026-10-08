"use client";

import { MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SaveResult } from "@/lib/useSavedItems";

const SaveButton = ({
  isSaved,
  onToggle,
  variant = "icon",
}: {
  isSaved: boolean;
  onToggle: () => Promise<SaveResult>;
  variant?: "icon" | "full";
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setBusy(true);
    const result = await onToggle();
    setBusy(false);

    if (result === "auth") router.push("/SignInForm");
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          isSaved
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="text-base leading-none">{isSaved ? "♥" : "♡"}</span>
        {isSaved ? "Saved" : "Save this post"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={isSaved ? "Remove from saved" : "Save this post"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg leading-none shadow transition hover:scale-110 disabled:opacity-60"
    >
      <span className={isSaved ? "text-red-600" : "text-gray-500"}>
        {isSaved ? "♥" : "♡"}
      </span>
    </button>
  );
};

export default SaveButton;