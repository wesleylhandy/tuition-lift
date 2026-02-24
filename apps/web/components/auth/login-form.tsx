"use client";

/**
 * LoginForm — email + password, submit calls signIn.
 * Displays error from action.
 * @see specs/012-auth-bridge-protected-routing spec US2, T012
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  /** Optional redirect path after successful login (from URL) */
  redirectTo?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] w-full cursor-pointer rounded-lg bg-electric-mint px-6 py-3 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Sign in"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent"
            aria-hidden
          />
          Signing in…
        </span>
      ) : (
        "Sign in"
      )}
    </button>
  );
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    if (redirectTo) {
      formData.set("redirectTo", redirectTo);
    }
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success && result?.redirect) {
      router.push(result.redirect);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mx-auto max-w-md space-y-6"
      noValidate
    >
      <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
        Sign in
      </h1>
      <p className="text-off-white/90">
        Enter your email and password to access your account.
      </p>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-off-white"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="login-password"
            className="text-sm font-medium text-off-white"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            placeholder="••••••••"
            className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </div>

        {error && (
          <p id="login-error" className="text-sm text-electric-mint" role="alert">
            {error}
          </p>
        )}

        <SubmitButton />
      </div>
    </form>
  );
}
