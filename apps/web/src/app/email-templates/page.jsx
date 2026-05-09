'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import { EmailTemplatesPage } from '@/screens/_inline/StubPages';

export default function Page() {
  return (
    <ProtectedShell>
      <EmailTemplatesPage />
    </ProtectedShell>
  );
}
