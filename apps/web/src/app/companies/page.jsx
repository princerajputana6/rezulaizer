'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { CompaniesPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <CompaniesPage />
    </ProtectedShell>
  );
}
