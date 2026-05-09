'use client';

import { RedirectIfAuthenticated } from '@/components/app/AuthGate';
import LoginPage from '@/screens/auth/LoginPage';

export default function Page() {
  return (
    <RedirectIfAuthenticated to="/dashboard">
      <LoginPage />
    </RedirectIfAuthenticated>
  );
}
