"use client";

/**
 * CheckEmailView — Instructions for Magic Link or Password Setup.
 * "Send Magic Link" button and "Set password" link.
 * When linkExpired: shows "This link has expired" with email input to request new link.
 * @see specs/012-auth-bridge-protected-routing spec US1, FR-003, T023
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestMagicLink } from "@/lib/actions/auth";

interface CheckEmailViewProps {
  /** Pre-filled email from landing hero query (empty when linkExpired from callback) */
  email: string;
  /** True when arriving from expired/invalid Magic Link callback */
  linkExpired?: boolean;
}

function SendMagicLinkButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] w-full cursor-pointer rounded-lg bg-electric-mint px-6 py-3 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Send magic link to your email"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
          Sending…
        </span>
      ) : (
        "Send Magic Link"
      )}
    </button>
  );
}

export function CheckEmailView({
  email: initialEmail,
  linkExpired = false,
}: CheckEmailViewProps) {
  const [email, setEmail] = useState(initialEmail);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsEmailInput = linkExpired || !initialEmail;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const emailValue = formData.get("email") as string;
    if (emailValue) formData.set("email", emailValue.trim());
    const result = await requestMagicLink(formData);
    if (result?.success) {
      setSuccess(true);
    } else if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md min-w-0 space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
        {linkExpired ? "This link has expired" : "Check your email"}
      </h1>
      <p className="text-off-white/90">
        {linkExpired ? (
          <>
            Request a new magic link or sign in with your password to continue.
          </>
        ) : (
          <>
            Choose how to sign in: use the Magic Link we&apos;ll send to{" "}
            <strong>{initialEmail}</strong>, or set a password to create your
            account.
          </>
        )}
      </p>

      <div className="space-y-4">
        <form action={handleSubmit} className="space-y-3">
          {needsEmailInput ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="check-email-input"
                className="text-sm font-medium text-off-white"
              >
                Email
              </label>
              <input
                id="check-email-input"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                aria-describedby={error ? "check-email-error" : undefined}
                aria-invalid={!!error}
              />
            </div>
          ) : (
            <input type="hidden" name="email" value={email} />
          )}
          <SendMagicLinkButton />
        </form>

        {success && (
          <p
            className="text-sm text-electric-mint"
            role="status"
            aria-live="polite"
          >
            Magic link sent! Check your inbox.
          </p>
        )}
        {error && (
          <p
            id="check-email-error"
            className="text-sm text-electric-mint"
            role="alert"
          >
            {error}
          </p>
        )}

        {!linkExpired && (
          <>
            <p className="text-sm text-off-white/70">— or —</p>

            <Link
              href={`/auth/password-setup?email=${encodeURIComponent(
                initialEmail || email
              )}`}
              className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Set password to create your account"
            >
              Set password
            </Link>
          </>
        )}

        {linkExpired && (
          <p className="text-sm text-off-white/70">— or —</p>
        )}
        {linkExpired && (
          <Link
            href="/login"
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            aria-label="Sign in with password"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
