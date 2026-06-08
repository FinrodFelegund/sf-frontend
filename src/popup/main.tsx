import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Popup }  from '@/src/popup/popup'
import "../globals.css"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <Popup />
  </StrictMode>,
)
