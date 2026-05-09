'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { InterviewHistoryPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <InterviewHistoryPage />
    </ProtectedShell>
  );
}
