import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { Toaster } from 'react-hot-toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <>
      <Toaster position="top-center" toastOptions={{
        style: { fontSize: '1rem', borderRadius: '0.75rem', padding: '1rem', background: '#fff', color: '#222' },
        error: { style: { background: '#fee2e2', color: '#b91c1c' } },
        success: { style: { background: '#dcfce7', color: '#166534' } },
      }} />
      <App />
    </>
  </React.StrictMode>
);