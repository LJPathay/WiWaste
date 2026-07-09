import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Remove splash once React has painted
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    (window as any).__hideSplash?.();
  });
});
