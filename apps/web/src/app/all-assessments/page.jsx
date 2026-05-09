'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { AllAssessmentsPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <AllAssessmentsPage />
    </ProtectedShell>
  );
}
