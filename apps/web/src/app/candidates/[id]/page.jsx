'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import CandidateProfile from '@/screens/candidates/CandidateProfile';

export default function Page() {
  return (
    <ProtectedShell>
      <CandidateProfile />
    </ProtectedShell>
  );
}
