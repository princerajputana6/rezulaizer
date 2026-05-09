'use client';

import dynamic from 'next/dynamic';

// Render MainLayout on the client only. The protected subtree depends on
// Redux auth state hydrated from localStorage, which doesn't exist on the
// server — server-rendering it causes hydration mismatches.
const MainLayout = dynamic(() => import('@/components/layout/MainLayout'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
    </div>
  ),
});

export default function ProtectedShell({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
