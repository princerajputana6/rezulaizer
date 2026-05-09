'use client';

import { RedirectIfAuthenticated } from '@/components/app/AuthGate';
import RezulyzerLandingPage from '@/screens/landing/RezulyzerLandingPage';

export default function Page() {
  return (
    <RedirectIfAuthenticated to="/dashboard">
      <RezulyzerLandingPage />
    </RedirectIfAuthenticated>
  );
}
