/**
 * Onboarding wizard layout.
 * Route group (onboard) — no segment in URL; /onboard.
 * T028: Resume step resolution — fetch profile, redirect if complete, pass initialStep to OnboardWizard.
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

  let initialStep: 1 | 2 | 3 = 1;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, intended_major, state")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete) {
      redirect("/dashboard");
    }

    if (!profile?.intended_major || !profile?.state) {
      initialStep = 2;
    } else {
      initialStep = 3;
    }
  }

  return (
    <OnboardStepProvider initialStep={initialStep}>
      <div className="min-h-screen bg-off-white font-body flex items-center justify-center p-4">
        {children}
      </div>
    </OnboardStepProvider>
  );
}
