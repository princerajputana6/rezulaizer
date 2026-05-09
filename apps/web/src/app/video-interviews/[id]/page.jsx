'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import VideoInterviewDetails from '@/screens/interviews/VideoInterviewDetails';

export default function Page() {
  return (
    <ProtectedShell>
      <VideoInterviewDetails />
    </ProtectedShell>
  );
}
