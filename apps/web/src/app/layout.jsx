import { Suspense } from 'react';
import '@/styles/globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Rezulyzer',
  description: 'AI-powered assessment & hiring platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
