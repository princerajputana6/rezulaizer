'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { AllInterviewsPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <AllInterviewsPage />
    </ProtectedShell>
  );
}
