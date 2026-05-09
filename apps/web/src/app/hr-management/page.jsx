'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import HRManagementFull from '@/screens/hr/HRManagementFull';

export default function Page() {
  return (
    <ProtectedShell>
      <HRManagementFull />
    </ProtectedShell>
  );
}
