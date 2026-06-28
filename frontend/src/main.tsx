import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './auth/auth-gate.tsx'
import { SocAuthProvider } from './auth/auth-context.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocAuthProvider>
      <AuthGate>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthGate>
    </SocAuthProvider>
  </StrictMode>,
)
