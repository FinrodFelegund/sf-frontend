import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Options } from "@/src/options/options"
import { LanguageProvider } from "@/hooks/language-hook"
import "../globals.css"


createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <LanguageProvider>
            <Options />
        </LanguageProvider>
    </StrictMode>
)