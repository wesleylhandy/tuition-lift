import Link from "next/link";

/**
 * Minimal landing placeholder — sign-in CTA so auth redirect (T005) has valid target.
 * Full landing design deferred per plan.md.
 */
export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-off-white px-4 font-body">
      <main
        className="flex flex-col items-center gap-8 text-center"
        aria-label="TuitionLift landing"
      >
        <h1 className="font-heading text-2xl font-semibold text-navy sm:text-3xl">
          TuitionLift
        </h1>
        <p className="max-w-sm text-slate">
          Fund your higher education debt-free with verified scholarship discovery.
        </p>
        <Link
          href="/onboard"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-electric-mint px-6 py-3 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          aria-label="Sign in to get started"
        >
          Sign in
        </Link>
      </main>
    </div>
  );
}
