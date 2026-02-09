import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './App.css';

console.log('✅ Index.js loaded');
const rootElement = document.getElementById('root');
console.log('✅ Root element found:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found! Cannot render app.');
} else {
  try {
    const root = createRoot(rootElement);
    console.log('✅ React root created');
    
    root.render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    console.log('✅ App rendered successfully');
  } catch (err) {
    console.error('❌ Error rendering app:', err);
  }
}
