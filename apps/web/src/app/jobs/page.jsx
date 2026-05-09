'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import AllJobsPage from '@/screens/jobs/AllJobsPage';

export default function Page() {
  return (
    <ProtectedShell>
      <AllJobsPage />
    </ProtectedShell>
  );
}
