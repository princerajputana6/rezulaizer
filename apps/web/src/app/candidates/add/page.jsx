'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import AddCandidatePage from '@/screens/candidates/AddCandidatePage';

export default function Page() {
  return (
    <ProtectedShell>
      <AddCandidatePage />
    </ProtectedShell>
  );
}
