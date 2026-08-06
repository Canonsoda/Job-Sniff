import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        {/* react-hot-toast defaults to a white card, which reads as a foreign
            element on the dark UI. Match the dashboard's glass panels instead.
            Individual toasts can still override this (the confirm dialog does). */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(15, 15, 28, 0.95)', // theme `dark`
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              backdropFilter: 'blur(12px)',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#2dd4bf', secondary: '#0f0f1c' } }, // teal-400
            error: { iconTheme: { primary: '#f87171', secondary: '#0f0f1c' } },   // red-400
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
