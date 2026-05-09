'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { AvailableTestsPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <AvailableTestsPage />
    </ProtectedShell>
  );
}
