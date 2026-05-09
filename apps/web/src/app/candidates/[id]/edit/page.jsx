'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import EditCandidate from '@/screens/candidates/EditCandidate';

export default function Page() {
  return (
    <ProtectedShell>
      <EditCandidate />
    </ProtectedShell>
  );
}
