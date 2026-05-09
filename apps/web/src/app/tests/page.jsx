'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import AssessmentResults from '@/screens/assessments/AssessmentResults';

export default function Page() {
  return (
    <ProtectedShell>
      <AssessmentResults />
    </ProtectedShell>
  );
}
