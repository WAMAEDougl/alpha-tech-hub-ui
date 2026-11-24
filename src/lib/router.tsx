"use client";

// The screens were written for react-router. These are the same names on top of the Next.js router, so
// moving a screen over only means changing its import line.
import NextLink from "next/link";
import { forwardRef, useCallback, useEffect, type ComponentProps } from "react";
import { usePathname, useRouter, useParams as useNextParams, useSearchParams as useNextSearchParams } from "next/navigation";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to: string; replace?: boolean };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...rest }, ref) {
  return <NextLink ref={ref} href={to} {...rest} />;
});

export function useNavigate() {
  const router = useRouter();
  return useCallback((to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === "number") { router.back(); return; }
    if (opts?.replace) router.replace(to); else router.push(to);
  }, [router]);
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useNextParams() as unknown as T;
}

export function useLocation() {
  return { pathname: usePathname() ?? "/" };
}

/** [params, setParams] like react-router's. Needs a <Suspense> above it on statically generated pages. */
export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => void] {
  const sp = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback((next: URLSearchParams | Record<string, string>, opts?: { replace?: boolean }) => {
    const qs = new URLSearchParams(next as Record<string, string>).toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (opts?.replace) router.replace(url); else router.push(url);
  }, [router, pathname]);
  return [new URLSearchParams(sp?.toString() ?? ""), set];
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => { if (replace) router.replace(to); else router.push(to); }, [to, replace, router]);
  return null;
}

export const NavLink = forwardRef<HTMLAnchorElement, Omit<LinkProps, "className" | "children"> & {
  end?: boolean;
  className?: string | ((s: { isActive: boolean }) => string);
  children?: React.ReactNode;
}>(function NavLink({ to, end, className, children, ...rest }, ref) {
  const pathname = usePathname() ?? "";
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return <NextLink ref={ref} href={to} className={typeof className === "function" ? className({ isActive }) : className} {...rest}>{children}</NextLink>;
});
