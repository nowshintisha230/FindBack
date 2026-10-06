import Link from "next/link";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-amber-100 bg-gray-900 px-4 py-10 text-gray-300 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <p className="text-xl font-extrabold text-white">
            Find<span className="text-amber-500">Back</span>
          </p>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Helping people find what they lost and return what they found.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
          <Link href="/" className="transition hover:text-amber-500">
            Home
          </Link>
          <Link href="/lost-item" className="transition hover:text-amber-500">
            Report Lost
          </Link>
          <Link href="/found-item" className="transition hover:text-amber-500">
            Report Found
          </Link>
          <Link href="/all-items" className="transition hover:text-amber-500">
            All Items
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
        © {year} FindBack. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;