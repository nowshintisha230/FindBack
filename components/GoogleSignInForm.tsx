"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";

import { Button } from "./ui/button";
import { auth, googleProvider, authReady } from "@/lib/Firebase";

const GoogleSignInForm = () => {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      await authReady;

      const result = await signInWithPopup(auth, googleProvider);

      console.log("User:", result.user);

      router.push("/");
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-amber-50/50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-8 shadow-xl sm:p-10">

        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="FindBack Logo"
            width={80}
            height={80}
            className="mb-3 h-20 w-20 object-contain"
            priority
          />

          <h1 className="text-3xl font-extrabold text-amber-900">
            FindBack
          </h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to FindBack
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Find lost items. Return what you find.
            <br />
            Make someone&apos;s day.
          </p>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="h-12 w-full gap-3 border-gray-200 bg-white text-base font-semibold text-gray-700 transition hover:border-amber-700 hover:bg-amber-50"
        >
          <FcGoogle size={22} />
          Continue with Google
        </Button>

        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Secure access
          </span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="text-center text-sm leading-6 text-gray-500">
          Quick, secure and simple sign in.
          <br />
          Your next discovery starts here!
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          By continuing, you agree to use FindBack responsibly and help return
          lost items to their owners.
        </p>
      </div>
    </div>
  );
};

export default GoogleSignInForm;