"use client";

/**
 * PasswordSetupForm — Password fields (min 8 chars), validation, submit calls signUp.
 * @see specs/012-auth-bridge-protected-routing spec US1, FR-004
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signUp } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface PasswordSetupFormProps {
  /** Pre-filled email from URL query */
  email: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] w-full cursor-pointer rounded-lg bg-electric-mint px-6 py-3 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Create your account"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
          Creating account…
        </span>
      ) : (
        "Create account"
      )}
    </button>
  );
}

export function PasswordSetupForm({ email }: PasswordSetupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("email", email);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success && result?.redirect) {
      const base = result.redirect;
      const url = base.startsWith("/onboard")
        ? `${base}${base.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}`
        : base;
      router.push(url);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mx-auto w-full max-w-md min-w-0 space-y-6"
      noValidate
    >
      <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
        Set your password
      </h1>
      <p className="text-off-white/90">
        Create a password to secure your account. Minimum 8 characters.
      </p>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-off-white">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby={error ? "password-error" : undefined}
            aria-invalid={!!error}
          />
          {error && (
            <p
              id="password-error"
              className="text-sm text-electric-mint"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <SubmitButton />
      </div>
    </form>
  );
}
