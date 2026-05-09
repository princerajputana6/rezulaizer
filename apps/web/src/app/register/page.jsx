'use client';

import { RedirectIfAuthenticated } from '@/components/app/AuthGate';
import RegisterPage from '@/screens/auth/RegisterPage';

export default function Page() {
  return (
    <RedirectIfAuthenticated to="/dashboard">
      <RegisterPage />
    </RedirectIfAuthenticated>
  );
}
