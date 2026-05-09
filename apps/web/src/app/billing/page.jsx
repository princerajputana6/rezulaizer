'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { BillingPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <BillingPage />
    </ProtectedShell>
  );
}
