"use client";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";

const Navbar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // Logged in -> go to the target page. Not logged in -> go to sign in.
  const handleProtectedNav = (path: string) => {
    if (loading) return;
    router.push(user ? path : "/SignInForm");
  };

  return (
    <nav className="border-b border-amber-100 bg-amber-50/60 px-3 py-2 shadow-sm sm:px-4 sm:py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Logo + name: left column on desktop */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 md:col-start-1 md:row-start-1"
        >
          <Image
            src="/logo.png"
            alt="FindBack Logo"
            width={40}
            height={40}
            className="h-8 w-8 object-contain sm:h-10 sm:w-10"
            priority
          />
          <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-amber-700">Find</span>
            <span className="text-amber-950">Back</span>
          </span>
        </Link>
 
        {/* Auth links: far right on desktop, top-right on mobile */}
        <div className="flex items-center gap-2 md:col-start-3 md:row-start-1 md:justify-self-end">
          {user ? (
            <>
              <Link
                href="/profile"
                className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 sm:px-4 sm:py-2 sm:text-sm"
              >
                <span className="hidden sm:inline">My </span>Profile
              </Link>
               <NotificationBell />
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800 sm:px-4 sm:py-2 sm:text-sm"
              >
                Sign Out
              </button>
             
            </>
          ) : (
            <Link
              href="/SignInForm"
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800 sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign In
            </Link>
          )}
        </div>

        
      </div>
    </nav>
  );
};

export default Navbar;