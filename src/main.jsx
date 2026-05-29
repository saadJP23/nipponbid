import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0d1424',
          color: '#f9fafb',
          border: '1px solid rgba(183,16,42,0.25)',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#b7102a', secondary: '#f9fafb' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#0d1424' } },
        duration: 4000,
      }}
    />
  </BrowserRouter>
)
