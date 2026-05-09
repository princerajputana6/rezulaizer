'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import InterviewReports from '@/screens/interviews/InterviewReports';

export default function Page() {
  return (
    <ProtectedShell>
      <InterviewReports />
    </ProtectedShell>
  );
}
