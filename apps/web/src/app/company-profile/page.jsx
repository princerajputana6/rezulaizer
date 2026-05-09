'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import CompanyProfile from '@/screens/company/CompanyProfile';

export default function Page() {
  return (
    <ProtectedShell>
      <CompanyProfile />
    </ProtectedShell>
  );
}
