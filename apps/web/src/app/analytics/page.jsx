'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import Analytics from '@/screens/Analytics';

export default function Page() {
  return (
    <ProtectedShell>
      <Analytics />
    </ProtectedShell>
  );
}
