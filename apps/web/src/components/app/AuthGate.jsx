'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

export function RedirectIfAuthenticated({ to = '/dashboard', children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const router = useRouter();
  // `mounted` defers the auth-aware branch until after hydration so the
  // first client render matches the server (which never has a token).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) router.replace(to);
  }, [mounted, isAuthenticated, router, to]);

  if (mounted && isAuthenticated) return null;
  return children;
}
