'use client';

import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';
import { useEffect, useMemo } from 'react';

export function Link({ to, href, replace, state: _state, children, ...rest }) {
  const target = to ?? href ?? '#';
  return (
    <NextLink href={target} replace={replace} {...rest}>
      {children}
    </NextLink>
  );
}

export function NavLink({ to, href, children, className, style, end: _end, ...rest }) {
  const pathname = usePathname();
  const target = to ?? href ?? '#';
  const isActive = pathname === target;
  const cls = typeof className === 'function' ? className({ isActive }) : className;
  const stl = typeof style === 'function' ? style({ isActive }) : style;
  const content = typeof children === 'function' ? children({ isActive }) : children;
  return (
    <NextLink href={target} className={cls} style={stl} {...rest}>
      {content}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return useMemo(() => {
    return (to, opts) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else if (to > 0) router.forward();
        return;
      }
      if (opts && opts.replace) router.replace(to);
      else router.push(to);
    };
  }, [router]);
}

export function useLocation() {
  const pathname = usePathname();
  const sp = useNextSearchParams();
  return useMemo(() => {
    const search = sp && sp.toString() ? `?${sp.toString()}` : '';
    return {
      pathname: pathname || '/',
      search,
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: null,
      key: 'default',
    };
  }, [pathname, sp]);
}

export function useParams() {
  const params = useNextParams();
  return params || {};
}

export function useSearchParams() {
  const sp = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setParams = (input) => {
    const next =
      typeof input === 'function'
        ? input(sp || new URLSearchParams())
        : input instanceof URLSearchParams
        ? input
        : new URLSearchParams(input);
    router.push(`${pathname}?${next.toString()}`);
  };
  return [sp || new URLSearchParams(), setParams];
}

export function Navigate({ to, replace }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}
