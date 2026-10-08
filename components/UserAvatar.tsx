"use client";

import { useState } from "react";

const UserAvatar = ({
  name,
  photo,
  className = "h-10 w-10 text-sm",
}: {
  name: string;
  photo: string;
  className?: string;
}) => {
  const [broken, setBroken] = useState(false);

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={name || "User"}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${className} shrink-0 rounded-full border-2 border-amber-200 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 font-bold text-white`}
    >
      {(name.trim()[0] || "?").toUpperCase()}
    </div>
  );
};

export default UserAvatar;