'use client';

import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import AppBootstrap from '@/components/app/AppBootstrap';

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <AppBootstrap>{children}</AppBootstrap>
    </Provider>
  );
}
