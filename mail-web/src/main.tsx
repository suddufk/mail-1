import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toast } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');

if (!root) {
  throw new Error('React root element is missing.');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toast.Provider placement="bottom end" />
    </QueryClientProvider>
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  const loading = document.getElementById('loading-first');
  if (!loading) return;
  loading.classList.add('loading-hide');
  window.setTimeout(() => loading.remove(), 220);
});
