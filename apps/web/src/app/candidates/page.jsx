'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import CandidatesPage from '@/screens/candidates/CandidatesPage';

export default function Page() {
  return (
    <ProtectedShell>
      <CandidatesPage />
    </ProtectedShell>
  );
}
