import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/router';
import { useAuthStore } from '@/stores/authStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <RouterProvider router={router} />;
}

export default App;
