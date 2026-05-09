'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { UsersPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <UsersPage />
    </ProtectedShell>
  );
}
