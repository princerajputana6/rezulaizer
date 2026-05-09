'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import JobDetailPage from '@/screens/jobs/JobDetailPage';

export default function Page() {
  return (
    <ProtectedShell>
      <JobDetailPage />
    </ProtectedShell>
  );
}
