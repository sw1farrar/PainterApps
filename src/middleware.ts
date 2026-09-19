import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";

function isProtected(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

function withLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get(LOCALE_COOKIE)) {
    const accept = request.headers.get("accept-language") ?? "";
    const locale = accept.toLowerCase().startsWith("es") ? "es" : "en";
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isProtected(request.nextUrl.pathname)) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/login";
      dest.search = "";
      dest.searchParams.set("next", request.nextUrl.pathname);
      return withLocaleCookie(request, NextResponse.redirect(dest));
    }
    return withLocaleCookie(request, NextResponse.next());
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<NextResponse["cookies"]["set"]>[2];
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const dest = request.nextUrl.clone();
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    dest.pathname = "/login";
    dest.search = "";
    dest.searchParams.set("next", nextPath);
    const redirect = NextResponse.redirect(dest);
    return withLocaleCookie(request, copyCookies(response, redirect));
  }

  return withLocaleCookie(request, response);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
