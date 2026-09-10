import { RouterProvider } from 'react-router';
import { ThemeProvider } from './hooks/useTheme';
import { router } from './routes';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
