import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

async function mountApp() {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    try {
      // Installed PWA workers can keep serving old assets during Vite development.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(
        registrations.map((registration) => registration.unregister()),
      );
    } catch {
      // Service worker cleanup must never prevent the app from starting.
    }
  }

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void mountApp();
