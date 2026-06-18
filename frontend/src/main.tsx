import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './auth/auth-gate.tsx'
import { SocAuthProvider } from './auth/auth-context.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocAuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </SocAuthProvider>
  </StrictMode>,
)
