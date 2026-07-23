import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';

const isDesktopRuntime = '__TAURI_INTERNALS__' in window;
const Surface = lazy(() => isDesktopRuntime ? import('./App.tsx') : import('./Website.tsx'));

document.documentElement.dataset.surface = isDesktopRuntime ? 'app' : 'website';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="surface-loading" aria-label="正在加载" />}>
      <Surface />
    </Suspense>
  </StrictMode>,
);
