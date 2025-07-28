import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function middleware(request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Check if this is the sign-in page
  if (request.nextUrl.pathname === "/sign-in") {
    // If user is already authenticated and has admin role, redirect to dashboard
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: adminRoles } = await supabase
        .from("admin_roles")
        .select("*")
        .eq("user_id", user.id);

      if (adminRoles && adminRoles.length > 0) {
        return NextResponse.redirect(new URL("/overview", request.url));
      }
    }

    return NextResponse.next();
  }

  // For all other routes, check authentication
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Check if user has admin role
  const { data: adminRoles, error: roleError } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("user_id", user.id);

  if (roleError || !adminRoles || adminRoles.length === 0) {
    // Sign out the user and redirect to sign-in
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
