'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { SystemSettingsPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <SystemSettingsPage />
    </ProtectedShell>
  );
}
