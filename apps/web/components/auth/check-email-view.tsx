"use client";

/**
 * CheckEmailView — Instructions for Magic Link or Password Setup.
 * "Send Magic Link" button and "Set password" link.
 * @see specs/012-auth-bridge-protected-routing spec US1, FR-003
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestMagicLink } from "@/lib/actions/auth";

interface CheckEmailViewProps {
  /** Pre-filled email from landing hero query */
  email: string;
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
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent"
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

export function CheckEmailView({ email }: CheckEmailViewProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    formData.set("email", email);
    const result = await requestMagicLink(formData);
    if (result?.success) {
      setSuccess(true);
    } else if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
        Check your email
      </h1>
      <p className="text-off-white/90">
        Choose how to sign in: use the Magic Link we&apos;ll send to{" "}
        <strong>{email}</strong>, or set a password to create your account.
      </p>

      <div className="space-y-4">
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="email" value={email} />
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
          <p className="text-sm text-electric-mint" role="alert">
            {error}
          </p>
        )}

        <p className="text-sm text-off-white/70">— or —</p>

        <Link
          href={`/auth/password-setup?email=${encodeURIComponent(email)}`}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label="Set password to create your account"
        >
          Set password
        </Link>
      </div>
    </div>
  );
}
