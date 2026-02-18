/**
 * Onboarding wizard layout.
 * Route group (onboard) — no segment in URL; /onboard.
 * T028 will add resume step resolution and redirect when onboarding_complete.
 */
export default function OnboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-off-white font-body flex items-center justify-center p-4">
      {children}
    </div>
  );
}
