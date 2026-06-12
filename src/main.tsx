import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App }  from '@/src/App'
import { AuthProvider } from '@/hooks/authentication-hook'
import "./globals.css"
import { LanguageProvider } from '@/hooks/language-hook'
import { ThemeProvider } from '@/hooks/theme-hook'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
)
