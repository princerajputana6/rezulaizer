'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import DashboardPage from '@/screens/dashboard/DashboardPage';

export default function Page() {
  return (
    <ProtectedShell>
      <DashboardPage />
    </ProtectedShell>
  );
}
