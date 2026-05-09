'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import CreateJobDescription from '@/screens/job-descriptions/CreateJobDescription';

export default function Page() {
  return (
    <ProtectedShell>
      <CreateJobDescription />
    </ProtectedShell>
  );
}
