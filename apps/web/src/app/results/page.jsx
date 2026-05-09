'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { ResultsPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <ResultsPage />
    </ProtectedShell>
  );
}
