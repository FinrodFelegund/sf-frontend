import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Popup }  from "@/src/popup/popup"
import { LanguageProvider } from '@/hooks/language-hook'
import "../globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <Popup />
    </LanguageProvider>
  </StrictMode>,
)
