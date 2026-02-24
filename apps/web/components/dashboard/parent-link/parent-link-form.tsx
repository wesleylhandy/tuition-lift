"use client";

/**
 * Parent link flow — student enters parent email; POST /api/parents/link.
 * Per contracts/api-parents.md §1. Parent account created if needed.
 */
import { useState } from "react";

export function ParentLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/parents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail: email.trim() }),
        credentials: "include",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setStatus("success");
        setEmail("");
        setMessage("Parent linked successfully. They can sign in with that email.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Failed to link parent");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to link parent");
    }
  };

  return (
    <section aria-label="Link parent" className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-navy">
        Link parent
      </h2>
      <p className="text-sm text-muted-foreground">
        Link a parent to your profile so they can view ROI comparison and add
        income or scholarship info.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="parent-email" className="sr-only">
            Parent email
          </label>
          <input
            id="parent-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
            disabled={status === "loading"}
            className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="min-h-[44px] rounded-md border border-electric-mint bg-electric-mint/20 px-4 py-2 text-sm font-medium text-navy hover:bg-electric-mint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Linking..." : "Link parent"}
        </button>
      </form>
      {message && (
        <p
          role="status"
          className={
            status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}
