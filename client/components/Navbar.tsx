import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-gray-800 px-8 py-5">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-2xl font-bold hover:text-gray-200">
          DevFlow
        </Link>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link href="/login" className="hover:text-white">
            Sign In
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}