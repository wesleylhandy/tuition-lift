/**
 * TestimonialGrid — Curated student testimonials for social proof.
 * Fetches testimonials ordered by display_order. Cards with quote, star_rating,
 * avatar_url, student_name, class_year. Loading skeleton, empty state per contracts/landing-sections.md.
 */

import { createDbClient } from "@repo/db";
import { testimonialSchema, type TestimonialSchema } from "@repo/db";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= rating
              ? "text-electric-mint"
              : "text-electric-mint/30"
          }
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function TestimonialGridSkeleton() {
  return (
    <section
      className="px-4 py-12"
      aria-label="Student testimonials (loading)"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 h-6 w-64 animate-pulse rounded bg-electric-mint/20" />
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-electric-mint/20 bg-navy/50 p-6"
            >
              <div className="h-4 w-full rounded bg-electric-mint/20" />
              <div className="mt-2 h-4 w-3/4 rounded bg-electric-mint/10" />
              <div className="mt-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-electric-mint/20" />
                <div className="h-4 w-24 rounded bg-electric-mint/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function TestimonialGrid() {
  const db = createDbClient();
  const { data, error } = await db
    .from("testimonials")
    .select("id, quote, star_rating, avatar_url, student_name, class_year, display_order, created_at")
    .order("display_order", { ascending: true });

  if (error) {
    return (
      <section className="px-4 py-12 text-center" aria-label="Student testimonials">
        <h2 className="font-heading text-xl font-semibold text-off-white">
          Trusted by students nationwide
        </h2>
      </section>
    );
  }

  const testimonials = (data ?? [])
    .map((row) => testimonialSchema.safeParse(row))
    .filter((r): r is { success: true; data: typeof testimonialSchema._type } => r.success)
    .map((r) => r.data);

  if (testimonials.length === 0) {
    return (
      <section className="px-4 py-12 text-center" aria-label="Student testimonials">
        <h2 className="font-heading text-xl font-semibold text-off-white">
          Trusted by students nationwide
        </h2>
      </section>
    );
  }

  return (
    <section
      className="px-4 py-12"
      aria-label="Student testimonials"
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center font-heading text-xl font-semibold text-off-white sm:text-2xl">
          Trusted by students nationwide
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonials.map((t) => (
            <article
              key={t.id}
              className="rounded-lg border border-electric-mint/20 bg-navy/50 p-6"
            >
              <StarRating rating={t.star_rating} />
              <blockquote className="mt-3 text-off-white/90">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer className="mt-4 flex items-center gap-3">
                {t.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Avatar URLs are user-curated, arbitrary domains
                  <img
                    src={t.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-electric-mint/20 font-medium text-electric-mint"
                    aria-hidden
                  >
                    {t.student_name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-off-white">{t.student_name}</p>
                  <p className="text-sm text-off-white/70">
                    Class of {t.class_year}
                  </p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
