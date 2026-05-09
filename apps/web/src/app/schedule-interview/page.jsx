'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import ReadyForInterview from '@/screens/interviews/ReadyForInterview';

export default function Page() {
  return (
    <ProtectedShell>
      <ReadyForInterview />
    </ProtectedShell>
  );
}
