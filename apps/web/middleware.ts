/**
 * Next.js middleware — session refresh and onboarding redirect.
 * T029: When path=/onboard and user has onboarding_complete=true, redirect to /dashboard
 * before layout renders (faster than layout redirect). FR-012.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isScout = pathname === "/scout" || pathname.startsWith("/scout/");

  // US3 T016: Protect /dashboard and /scout; redirect unauthenticated to /login?redirectTo=
  if ((isDashboard || isScout) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // US3 T016: Redirect authenticated users with incomplete onboarding from /dashboard, /scout to /onboard
  if ((isDashboard || isScout) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete === false) {
      return NextResponse.redirect(new URL("/onboard", request.url));
    }
  }

  // T029: Only check profile for /onboard when user is authenticated
  if (pathname === "/onboard" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/onboard",
    "/dashboard",
    "/dashboard/:path*",
    "/scout",
    "/scout/:path*",
  ],
};
