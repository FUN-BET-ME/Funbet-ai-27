import React, { Suspense, lazy } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/context/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load components for code splitting
const StatusDashboard = lazy(() => import('@/components/StatusDashboard'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" data-testid="loading-fallback">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="App" data-testid="app-root">
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<StatusDashboard />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
