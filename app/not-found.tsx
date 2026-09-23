import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0D33] text-white px-4 text-center">
      <p className="text-[#00C851] font-bold text-xs uppercase tracking-widest mb-6">404 — Page not found</p>
      <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 max-w-xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="text-white/60 text-lg max-w-md mb-10">
        You may have followed a broken link. Head back home.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[#00C851] text-[#0F0D33] font-bold px-8 py-4 text-lg hover:opacity-90 transition-opacity"
      >
        Back home
      </Link>
    </div>
  );
}
