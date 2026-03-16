import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { PartnerProvider } from './contexts/PartnerContext';

function App() {
  return (
    <PermissionsProvider>
      <PartnerProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" closeButton richColors />
      </PartnerProvider>
    </PermissionsProvider>
  );
}

export default App;
