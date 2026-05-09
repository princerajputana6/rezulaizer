'use client';

import ProtectedShell from '@/components/app/ProtectedShell';
import SettingsScreen from '@/screens/settings/SettingsScreen';

export default function Page() {
  return (
    <ProtectedShell>
      <SettingsScreen />
    </ProtectedShell>
  );
}
