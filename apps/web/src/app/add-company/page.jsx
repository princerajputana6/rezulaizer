'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import AddCompany from '@/screens/AddCompany';

export default function Page() {
  return (
    <ProtectedShell>
      <AddCompany />
    </ProtectedShell>
  );
}
