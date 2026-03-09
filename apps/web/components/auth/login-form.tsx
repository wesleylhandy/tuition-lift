"use client";

/**
 * LoginForm — email + password OR OTP code sign-in.
 * Supports users who registered via Magic Link only (no password set).
 * @see specs/012-auth-bridge-protected-routing spec US2, T012
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, requestMagicLink, verifyOtp } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  /** Optional redirect path after successful login (from URL) */
  redirectTo?: string;
}

function SignInSubmitButton() {
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
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent motion-reduce:animate-none"
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

function SendCodeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] w-full cursor-pointer rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Send verification code"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-electric-mint border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
          Sending…
        </span>
      ) : (
        "Send code"
      )}
    </button>
  );
}

function VerifyCodeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] min-w-[44px] cursor-pointer rounded-lg border border-electric-mint/50 bg-transparent px-6 py-3 font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Verify code"
    >
      {pending ? "Verifying…" : "Verify"}
    </button>
  );
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [useCode, setUseCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeEmail, setCodeEmail] = useState("");
  const router = useRouter();

  async function handlePasswordSubmit(formData: FormData) {
    setError(null);
    setOtpError(null);
    if (redirectTo) formData.set("redirectTo", redirectTo);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success && result?.redirect) {
      router.push(result.redirect);
    }
  }

  async function handleSendCode(formData: FormData) {
    setError(null);
    setOtpError(null);
    const result = await requestMagicLink(formData);
    if (result?.success) {
      const email = (formData.get("email") as string)?.trim() ?? "";
      setCodeEmail(email);
      setCodeSent(true);
    } else if (result?.error) {
      setError(result.error);
    }
  }

  async function handleVerifyOtp(formData: FormData) {
    setOtpError(null);
    if (codeEmail) formData.set("email", codeEmail);
    if (redirectTo) formData.set("redirectTo", redirectTo);
    const result = await verifyOtp(formData);
    if (result?.error) {
      setOtpError(result.error);
      return;
    }
    if (result?.success && result?.redirect) {
      router.push(result.redirect);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md min-w-0 space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-off-white sm:text-3xl">
        Sign in
      </h1>
      <p className="text-off-white/90">
        Enter your email and password, or sign in with a code sent to your
        email.
      </p>

      <div className="space-y-4">
        {!useCode ? (
          <>
            <form
              action={handlePasswordSubmit}
              className="space-y-4"
              noValidate
            >
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
                <p
                  id="login-error"
                  className="text-sm text-electric-mint"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <SignInSubmitButton />
            </form>

            <p className="text-sm text-off-white/70">— or —</p>
            <button
              type="button"
              onClick={() => setUseCode(true)}
              className="w-full text-left text-sm font-medium text-electric-mint underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Sign in with verification code instead"
            >
              Sign in with a code sent to your email
            </button>
          </>
        ) : !codeSent ? (
          <>
            <form action={handleSendCode} className="space-y-4" noValidate>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-code-email"
                  className="text-sm font-medium text-off-white"
                >
                  Email
                </label>
                <input
                  id="login-code-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="min-h-[44px] w-full rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby={error ? "login-code-error" : undefined}
                  aria-invalid={!!error}
                />
              </div>

              {error && (
                <p
                  id="login-code-error"
                  className="text-sm text-electric-mint"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <SendCodeSubmitButton />
            </form>

            <button
              type="button"
              onClick={() => setUseCode(false)}
              className="w-full text-left text-sm font-medium text-electric-mint underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Sign in with password instead"
            >
              Sign in with password instead
            </button>
          </>
        ) : (
          <>
            <p
              className="text-sm text-electric-mint"
              role="status"
              aria-live="polite"
            >
              We sent a 6-digit code to <strong>{codeEmail}</strong>. Enter it
              below.
            </p>
            <form
              action={handleVerifyOtp}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              noValidate
            >
              <input type="hidden" name="email" value={codeEmail} />
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <label
                  htmlFor="login-otp-code"
                  className="text-sm font-medium text-off-white"
                >
                  6-digit code
                </label>
                <input
                  id="login-otp-code"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  className="min-h-[44px] w-full max-w-40 rounded-lg border border-electric-mint/40 bg-navy/50 px-4 py-3 text-off-white placeholder:text-off-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
                  aria-describedby={otpError ? "login-otp-error" : undefined}
                  aria-invalid={!!otpError}
                />
              </div>
              <VerifyCodeSubmitButton />
            </form>

            {otpError && (
              <p
                id="login-otp-error"
                className="text-sm text-electric-mint"
                role="alert"
              >
                {otpError}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setOtpError(null);
              }}
              className="w-full text-left text-sm font-medium text-electric-mint underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              aria-label="Send a new code"
            >
              Send a new code
            </button>
          </>
        )}
      </div>
    </div>
  );
}
