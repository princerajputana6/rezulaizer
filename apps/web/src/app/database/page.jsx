'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { DatabasePage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <DatabasePage />
    </ProtectedShell>
  );
}
