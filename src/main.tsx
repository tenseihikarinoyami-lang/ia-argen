import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against DataCloneError in environments that override/leak window.performance
if (typeof window !== 'undefined' && window.performance) {
  try {
    const originalMeasure = window.performance.measure;
    if (typeof originalMeasure === 'function') {
      window.performance.measure = function (...args) {
        try {
          return originalMeasure.apply(window.performance, args);
        } catch (e) {
          console.debug("Muted performance.measure exception:", e);
          return null as any;
        }
      };
    }
  } catch (e) {}

  try {
    const originalMark = window.performance.mark;
    if (typeof originalMark === 'function') {
      window.performance.mark = function (...args) {
        try {
          return originalMark.apply(window.performance, args);
        } catch (e) {
          console.debug("Muted performance.mark exception:", e);
          return null as any;
        }
      };
    }
  } catch (e) {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

