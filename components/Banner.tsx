"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/Firebase";
import Link from "next/link";

const Banner = () => {
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

  
  const handleProtectedNav = (path: string) => {
    if (loading) return;
    router.push(user ? path : "/SignInForm");
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
     
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-orange-300/30 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
       
        <div className="text-center md:text-left">
          <span className="inline-block rounded-full border border-amber-200 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
            Lost &amp; Found Community
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Lost something?
            <br />
            Let&apos;s{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              FindBack
            </span>{" "}
            it.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-gray-600 md:mx-0 md:text-lg">
            Report what you&apos;ve lost, return what you&apos;ve found.
            <br className="hidden sm:block" />
            One post from you can change someone&apos;s day.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link href="LostForm"
              className="rounded-xl bg-red-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-50"
            >
              I Lost Something
            </Link>

            <button
              onClick={() => handleProtectedNav("/found-item")}
              disabled={loading}
              className="rounded-xl bg-green-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-600/20 transition hover:-translate-y-0.5 hover:bg-green-700 disabled:opacity-50"
            >
              I Found Something
            </button>
          </div>

          {/* Feature points */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-amber-900 md:justify-start">
            <span>✔ Free to use</span>
            <span>✔ Secure Google sign in</span>
            <span>✔ Community powered</span>
          </div>
        </div>

        {/* Right: logo card */}
        <div className="relative mx-auto w-full max-w-sm md:max-w-md">
          <div className="rounded-3xl border border-amber-100 bg-white p-8 shadow-2xl sm:p-10">
            <div className="flex flex-col items-center">
              <Image
                src="/logo.png"
                alt="FindBack Logo"
                width={160}
                height={160}
                className="h-32 w-32 object-contain sm:h-40 sm:w-40"
                priority
              />
              <h2 className="mt-4 text-3xl font-extrabold">
                <span className="text-amber-700">Find</span>
                <span className="text-amber-950">Back</span>
              </h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Return what you find. <br />
                Make someone&apos;s day.
              </p>
            </div>
          </div>

          {/* Floating chips */}
          <div className="absolute -left-3 -top-4 rotate-[-6deg] rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg sm:-left-6 sm:text-sm">
            Lost
          </div>
          <div className="absolute -bottom-4 -right-3 rotate-[6deg] rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg sm:-right-6 sm:text-sm">
            Found ✓
          </div>
        </div>
      </div>
    </section>
  );
};

export default Banner;