'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { TestHistoryPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <TestHistoryPage />
    </ProtectedShell>
  );
}
