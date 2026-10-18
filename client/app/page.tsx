import Link from "next/link";
import Navbar from "@/components/Navbar";
import ApiStatus from "@/components/ApiStatus";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <section className="px-8 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium text-blue-400">
            DEVELOPER COLLABORATION PLATFORM
          </p>

          <h2 className="max-w-3xl text-5xl font-bold tracking-tight">
            Build better software together.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
            DevFlow helps development teams manage projects, issues,
            collaboration, and developer activity in one place.
          </p>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-gray-200"
            >
              Get Started
            </Link>
          </div>

          <ApiStatus />
        </div>
      </section>
    </main>
  );
}