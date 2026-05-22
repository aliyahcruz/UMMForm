import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "umm.edu").toLowerCase();

function isAllowedEmail(email) {
  return String(email || "").toLowerCase().endsWith(`@${allowedDomain}`);
}

function isPublicPath(pathname) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  );
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user || !isAllowedEmail(user.email)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
