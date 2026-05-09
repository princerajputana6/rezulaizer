'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import VideoInterviewsListNew from '@/screens/interviews/VideoInterviewsListNew';

export default function Page() {
  return (
    <ProtectedShell>
      <VideoInterviewsListNew />
    </ProtectedShell>
  );
}
