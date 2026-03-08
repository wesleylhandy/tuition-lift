/**
 * Onboarding wizard layout.
 * Route group (onboard) — no segment in URL; /onboard.
 * T028: Resume step resolution — fetch profile, redirect if complete, pass initialStep to OnboardWizard.
 * T015: Step 0 resume when user has account but no award_year; users from Password Setup resume at Step 2.
 */
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardStepProvider } from "@/components/onboard/onboard-step-provider";

export default async function OnboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialStep: 0 | 1 | 2 | 3 = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, award_year, intended_major, state")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete) {
      redirect("/dashboard");
    }

    if (profile?.award_year == null) {
      initialStep = 0;
    } else if (!profile?.intended_major || !profile?.state) {
      initialStep = 2;
    } else {
      initialStep = 3;
    }
  }

  return (
    <OnboardStepProvider initialStep={initialStep} isLoggedIn={!!user}>
      <div className="flex min-h-screen items-center justify-center bg-off-white p-4 font-body sm:p-6">
        {children}
      </div>
    </OnboardStepProvider>
  );
}
